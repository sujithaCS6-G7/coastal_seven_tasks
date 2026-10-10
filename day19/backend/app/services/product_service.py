"""Product service managing CRUD, Pillow image uploads, and Redis caching."""

import io
import uuid
from fastapi import HTTPException, UploadFile, status
from PIL import Image
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductListResponse, ProductOut, ProductUpdate
from app.utils.redis_client import redis_manager


class ProductService:
    """Business logic for product catalog, image processing, Redis caching, and PostgreSQL FTS/Fuzzy search."""

    @staticmethod
    def create(db: Session, data: ProductCreate) -> Product:
        """Create new product and invalidate Redis catalog cache."""
        product = Product(
            name=data.name,
            description=data.description,
            price=data.price,
            stock=data.stock,
            category=data.category,
        )
        db.add(product)
        db.commit()
        db.refresh(product)

        # Invalidate Redis cache
        redis_manager.invalidate_product_cache()
        return product

    @staticmethod
    def list_products(
        db: Session, category: str | None = None, limit: int = 50, offset: int = 0
    ) -> ProductListResponse:
        """Fetch products with Redis Cache-Aside pattern."""
        cached_data = redis_manager.get_cached_products(category)
        if cached_data is not None:
            # Sliced by limit/offset
            sliced = cached_data[offset : offset + limit]
            return ProductListResponse(
                total=len(cached_data),
                products=[ProductOut(**p) for p in sliced],
                cached=True,
            )

        # Query PostgreSQL
        query = db.query(Product)
        if category:
            query = query.filter(Product.category.ilike(category))

        total = query.count()
        all_records = query.order_by(Product.id.asc()).all()

        # Cache full dataset for this category
        to_cache = [
            ProductOut.model_validate(p).model_dump(mode="json")
            for p in all_records
        ]
        redis_manager.set_cached_products(to_cache, category)

        sliced_records = all_records[offset : offset + limit]
        return ProductListResponse(
            total=total,
            products=[ProductOut.model_validate(p) for p in sliced_records],
            cached=False,
        )

    @staticmethod
    def search_products(
        db: Session,
        q: str,
        mode: str = "fulltext",
        category: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> ProductListResponse:
        """
        Execute database-side PostgreSQL search:
        - mode='fulltext': Uses tsvector (search_vector @@ websearch_to_tsquery('english', :q)),
          ts_rank relevance ranking, and GIN index (idx_products_search_vector_gin).
        - mode='fuzzy': Uses PostgreSQL pg_trgm trigram similarity / word_similarity
          and GIN trigram index (idx_products_trgm_gin) for typo-tolerant search (e.g. 'iphon' -> 'iPhone').
        - mode='combined': Combines PostgreSQL Full-Text Search rank + pg_trgm similarity.
        """
        cleaned_query = (q or "").strip()
        normalized_mode = (mode or "fulltext").lower()
        if normalized_mode not in {"fulltext", "fuzzy", "combined"}:
            normalized_mode = "fulltext"

        if not cleaned_query:
            base = ProductService.list_products(db, category=category, limit=limit, offset=offset)
            base.query = ""
            base.search_mode = normalized_mode
            return base

        category_clause = "AND LOWER(p.category) = LOWER(:category)" if category else ""
        params: dict = {
            "q": cleaned_query,
            "limit": limit,
            "offset": offset,
        }
        if category:
            params["category"] = category

        if normalized_mode == "fulltext":
            sql = text(
                f"""
                SELECT
                    p.id,
                    p.name,
                    p.description,
                    p.price,
                    p.stock,
                    p.category,
                    p.image_url,
                    p.created_at,
                    p.updated_at,
                    ROUND(
                        CAST(
                            ts_rank_cd(
                                COALESCE(
                                    p.search_vector,
                                    setweight(to_tsvector('english', coalesce(p.name, '')), 'A') ||
                                    setweight(to_tsvector('english', coalesce(p.category, '')), 'B') ||
                                    setweight(to_tsvector('english', coalesce(p.description, '')), 'C')
                                ),
                                websearch_to_tsquery('english', :q)
                            ) AS numeric
                        ),
                        4
                    ) AS relevance_score,
                    'fulltext_tsvector' AS match_type
                FROM products p
                WHERE (
                    COALESCE(
                        p.search_vector,
                        setweight(to_tsvector('english', coalesce(p.name, '')), 'A') ||
                        setweight(to_tsvector('english', coalesce(p.category, '')), 'B') ||
                        setweight(to_tsvector('english', coalesce(p.description, '')), 'C')
                    ) @@ websearch_to_tsquery('english', :q)
                )
                {category_clause}
                ORDER BY relevance_score DESC, p.id ASC
                LIMIT :limit OFFSET :offset
                """
            )
            index_used = "idx_products_search_vector_gin (GIN tsvector)"
        elif normalized_mode == "fuzzy":
            sql = text(
                f"""
                SELECT
                    p.id,
                    p.name,
                    p.description,
                    p.price,
                    p.stock,
                    p.category,
                    p.image_url,
                    p.created_at,
                    p.updated_at,
                    ROUND(
                        CAST(
                            GREATEST(
                                similarity(p.name, :q),
                                word_similarity(:q, p.name),
                                word_similarity(:q, coalesce(p.category, '')),
                                word_similarity(:q, coalesce(p.description, '')) * 0.85
                            ) AS numeric
                        ),
                        4
                    ) AS relevance_score,
                    'fuzzy_pg_trgm' AS match_type
                FROM products p
                WHERE (
                    similarity(p.name, :q) >= 0.18
                    OR word_similarity(:q, p.name) >= 0.30
                    OR word_similarity(:q, coalesce(p.category, '')) >= 0.35
                    OR word_similarity(:q, coalesce(p.description, '')) >= 0.35
                    OR p.name ILIKE ('%' || :q || '%')
                )
                {category_clause}
                ORDER BY relevance_score DESC, p.id ASC
                LIMIT :limit OFFSET :offset
                """
            )
            index_used = "idx_products_trgm_gin (GIN pg_trgm)"
        else:
            # combined mode: FTS rank + pg_trgm similarity
            sql = text(
                f"""
                SELECT
                    p.id,
                    p.name,
                    p.description,
                    p.price,
                    p.stock,
                    p.category,
                    p.image_url,
                    p.created_at,
                    p.updated_at,
                    ROUND(
                        CAST(
                            (
                                ts_rank_cd(
                                    COALESCE(
                                        p.search_vector,
                                        setweight(to_tsvector('english', coalesce(p.name, '')), 'A') ||
                                        setweight(to_tsvector('english', coalesce(p.category, '')), 'B') ||
                                        setweight(to_tsvector('english', coalesce(p.description, '')), 'C')
                                    ),
                                    websearch_to_tsquery('english', :q)
                                ) * 0.6
                                + GREATEST(
                                    similarity(p.name, :q),
                                    word_similarity(:q, p.name),
                                    word_similarity(:q, coalesce(p.description, '')) * 0.8
                                ) * 0.4
                            ) AS numeric
                        ),
                        4
                    ) AS relevance_score,
                    CASE
                        WHEN p.search_vector @@ websearch_to_tsquery('english', :q) THEN 'fulltext_tsvector'
                        ELSE 'fuzzy_pg_trgm'
                    END AS match_type
                FROM products p
                WHERE (
                    p.search_vector @@ websearch_to_tsquery('english', :q)
                    OR similarity(p.name, :q) >= 0.18
                    OR word_similarity(:q, p.name) >= 0.30
                    OR word_similarity(:q, coalesce(p.description, '')) >= 0.35
                )
                {category_clause}
                ORDER BY relevance_score DESC, p.id ASC
                LIMIT :limit OFFSET :offset
                """
            )
            index_used = "idx_products_search_vector_gin + idx_products_trgm_gin"

        rows = db.execute(sql, params).mappings().all()
        if not rows and normalized_mode == "fulltext":
            return ProductService.search_products(
                db=db,
                q=cleaned_query,
                mode="fuzzy",
                category=category,
                limit=limit,
                offset=offset,
            )

        products = [
            ProductOut(
                id=row["id"],
                name=row["name"],
                description=row["description"],
                price=float(row["price"]),
                stock=int(row["stock"]),
                category=row["category"],
                image_url=row["image_url"],
                relevance_score=float(row["relevance_score"]) if row["relevance_score"] is not None else 0.0,
                match_type=row["match_type"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
            for row in rows
        ]

        return ProductListResponse(
            total=len(products),
            products=products,
            cached=False,
            query=cleaned_query,
            search_mode=normalized_mode,
            index_used=index_used,
        )


    @staticmethod
    def get_by_id(db: Session, product_id: int) -> Product:
        """Retrieve single product by ID or raise 404."""
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {product_id} not found.",
            )
        return product

    @staticmethod
    def update(db: Session, product_id: int, data: ProductUpdate) -> Product:
        """Update product and invalidate Redis cache."""
        product = ProductService.get_by_id(db, product_id)
        if data.name is not None:
            product.name = data.name
        if data.description is not None:
            product.description = data.description
        if data.price is not None:
            product.price = data.price
        if data.stock is not None:
            product.stock = data.stock
        if data.category is not None:
            product.category = data.category

        db.commit()
        db.refresh(product)
        redis_manager.invalidate_product_cache()
        return product

    @staticmethod
    def delete(db: Session, product_id: int) -> None:
        """Delete product and invalidate Redis cache."""
        product = ProductService.get_by_id(db, product_id)
        db.delete(product)
        db.commit()
        redis_manager.invalidate_product_cache()

    @staticmethod
    async def upload_image(db: Session, product_id: int, file: UploadFile) -> Product:
        """Validate and optimize product image using Pillow, then update image_url."""
        product = ProductService.get_by_id(db, product_id)

        # Validate MIME
        if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid image type '{file.content_type}'. Allowed: JPEG, PNG, WEBP.",
            )

        contents = await file.read()
        if len(contents) > settings.MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Image size exceeds 5MB limit.",
            )

        # Pillow structure check and resizing
        try:
            with Image.open(io.BytesIO(contents)) as pil_img:
                pil_img.verify()

            with Image.open(io.BytesIO(contents)) as pil_img:
                # Resize if exceeds 1200x1200
                pil_img.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
                ext = file.filename.split(".")[-1].lower() if file.filename else "jpg"
                filename = f"prod_{product_id}_{uuid.uuid4().hex[:8]}.{ext}"
                target_path = settings.UPLOAD_DIR / filename

                # Save optimized image
                pil_img.save(target_path, optimize=True, quality=85)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Corrupted or invalid image file: {exc}",
            )

        image_url = f"/uploads/products/{filename}"
        product.image_url = image_url
        db.commit()
        db.refresh(product)

        redis_manager.invalidate_product_cache()
        return product
