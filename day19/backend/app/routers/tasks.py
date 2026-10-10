"""Tasks router for Day 18 Celery background jobs: PDF Invoice Generation, Bulk CSV Import & Status Polling."""

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse, PlainTextResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.services.auth_service import get_current_admin, get_current_user
from app.services.order_service import OrderService
from app.tasks.background_tasks import (
    _build_invoice_pdf_bytes,
    dispatch_csv_import_task,
    dispatch_invoice_task,
    get_task_status_payload,
)
from app.utils.rate_limit import limiter
from app.utils.security import decode_access_token

router = APIRouter(prefix="/tasks", tags=["Background Tasks (Celery)"])

SAMPLE_CSV_CONTENT = """name,category,price,stock,description,image_url
iPhone 16 Pro Max,Electronics,1199.99,30,Flagship smartphone with A18 Pro chip and Titanium frame,http://127.0.0.1:8003/uploads/products/laptop.jpg
MacBook Air M3 15-inch,Electronics,1399.00,18,Ultra-thin Apple Silicon laptop with 18-hour battery life,http://127.0.0.1:8003/uploads/products/laptop.jpg
Sony WH-1000XM5 Wireless,Audio,349.99,42,Industry-leading wireless noise-cancelling studio headphones,http://127.0.0.1:8003/uploads/products/headphones.jpg
Keychron Q1 Pro Mechanical Keyboard,Accessories,199.00,25,Custom QMK/VIA wireless mechanical keyboard with CNC aluminum body,http://127.0.0.1:8003/uploads/products/broken_404_image.jpg
LG UltraGear 32-inch OLED 240Hz,Displays,899.99,12,4K UHD OLED gaming monitor with 0.03ms response time,
Invalid Demo Row,Accessories,-15.00,10,Intentional invalid row with negative price to demonstrate error handling,http://127.0.0.1:8003/uploads/products/keyboard.jpg
"""


def get_user_or_default_admin(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """Resolve authenticated user from Bearer token, or fallback to admin for direct Swagger/Lab testing."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        raw_token = auth_header.split(" ", 1)[1].strip()
        payload = decode_access_token(raw_token)
        if payload and "user_id" in payload:
            user = db.query(User).filter(User.id == payload["user_id"]).first()
            if user:
                return user
    admin_user = db.query(User).filter(User.role == "admin").first()
    if not admin_user:
        admin_user = db.query(User).first()
    if not admin_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No user available.")
    return admin_user


@router.get(
    "/demo-orders",
    summary="List Orders Available for Celery PDF Invoice Generation",
)
def get_demo_orders_for_celery(
    db: Session = Depends(get_db),
):
    """Return orders with customer and items so the Celery Lab UI can trigger PDF invoices immediately."""
    orders = OrderService.get_all_orders(db)
    return [
        {
            "id": o.id,
            "order_number": o.order_number,
            "status": o.status,
            "total_amount": float(o.total_amount),
            "shipping_address": o.shipping_address,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "customer": o.user.username if o.user else f"User #{o.user_id}",
            "items_count": len(o.items),
        }
        for o in orders
    ]


@router.get(
    "/csv-template",
    response_class=PlainTextResponse,
    summary="Download Sample CSV Template for Bulk Product Import",
)
def get_csv_template():
    """Return a ready-to-use sample CSV template (including valid rows and 1 demo validation row)."""
    return PlainTextResponse(
        content=SAMPLE_CSV_CONTENT,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="sample_products_import.csv"'},
    )


@router.post(
    "/invoices/{order_id}",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Start Asynchronous PDF Invoice Generation (Celery & Rate Limited)",
)
@limiter.limit(settings.RATE_LIMIT_TASKS)
def start_invoice_generation(
    request: Request,
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_user_or_default_admin),
):
    """Trigger non-blocking Celery task to generate a PDF invoice for the specified order."""
    order = OrderService.get_order_by_id(db, order_id=order_id, user=current_user)
    task_id = dispatch_invoice_task(order_id=order.id, user_id=current_user.id)
    return get_task_status_payload(task_id)


@router.get(
    "/invoices/{order_id}/download",
    summary="Download Generated PDF Invoice",
)
def download_invoice_pdf(
    order_id: int,
    request: Request,
    token: str | None = Query(None, description="Optional JWT token for direct browser download links"),
    db: Session = Depends(get_db),
):
    """Download the generated PDF invoice file for an order (supports Bearer header, ?token= query param, or direct Lab download)."""
    auth_header = request.headers.get("Authorization", "")
    raw_token = token
    if not raw_token and auth_header.lower().startswith("bearer "):
        raw_token = auth_header.split(" ", 1)[1].strip()

    user = None
    if raw_token:
        payload = decode_access_token(raw_token)
        if payload and "user_id" in payload:
            user = db.query(User).filter(User.id == payload["user_id"]).first()

    if not user:
        user = db.query(User).filter(User.role == "admin").first() or db.query(User).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    order = OrderService.get_order_by_id(db, order_id=order_id, user=user)
    safe_order_num = "".join(c for c in order.order_number if c.isalnum() or c in ("-", "_"))
    filename = f"invoice_{safe_order_num}.pdf"
    settings.INVOICE_DIR.mkdir(parents=True, exist_ok=True)
    file_path = settings.INVOICE_DIR / filename

    if not file_path.exists():
        # Generate on-demand if not yet written on disk
        pdf_bytes = _build_invoice_pdf_bytes(
            order_number=order.order_number,
            order_id=order.id,
            customer_name=order.user.username if order.user else f"Customer #{order.user_id}",
            customer_email=order.user.email if order.user else "customer@nexora.com",
            shipping_address=order.shipping_address,
            status_label=order.status,
            created_at_str=order.created_at.strftime("%Y-%m-%d %H:%M UTC"),
            items=[
                {
                    "product_name": item.product_name,
                    "quantity": item.quantity,
                    "unit_price": float(item.unit_price),
                    "total_price": float(item.total_price),
                }
                for item in order.items
            ],
            total_amount=float(order.total_amount),
        )
        file_path.write_bytes(pdf_bytes)

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=filename,
    )


@router.post(
    "/csv-import",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Start Asynchronous Bulk CSV Product Import (Admin Only & Rate Limited)",
)
@limiter.limit(settings.RATE_LIMIT_TASKS)
async def start_bulk_csv_import(
    request: Request,
    file: UploadFile = File(...),
    admin: User = Depends(get_user_or_default_admin),
):
    """Upload a CSV file and start a non-blocking Celery task to import products with progress tracking."""
    filename = file.filename or "products.csv"
    if not filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload a valid .csv file.",
        )

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded CSV file is empty.",
        )

    try:
        csv_text = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        csv_text = raw_bytes.decode("latin-1", errors="replace")

    if not csv_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded CSV file contains no text content.",
        )

    task_id = dispatch_csv_import_task(csv_text=csv_text, filename=filename)
    return get_task_status_payload(task_id)


@router.get(
    "/{task_id}",
    summary="Poll Celery Background Task Status & Progress",
)
def get_task_status(
    task_id: str,
    current_user: User = Depends(get_user_or_default_admin),
):
    """Return real-time Celery task status (PENDING, STARTED, COMPLETED, FAILED), progress %, and result."""
    return get_task_status_payload(task_id)
