from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models import Base
from schemas import ProjectCreate, TaskCreate, TaskUpdate
import crud
from config import settings
from auth import hash_password, verify_password, create_access_token, decode_token


DATABASE_URL = settings.DATABASE_URL

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

Base.metadata.create_all(engine)

app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    payload = decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    username = payload.get("sub")

    user = crud.get_user_by_username(db, username)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user


@app.post("/register")
def register(
    username: str,
    password: str,
    db: Session = Depends(get_db)
):
    existing = crud.get_user_by_username(db, username)

    if existing:
        raise HTTPException(
            status_code=400,
            detail="User already exists"
        )

    hashed = hash_password(password)

    user = crud.create_user(
        db,
        username,
        hashed
    )

    return {
        "message": "User registered",
        "id": user.id,
        "username": user.username
    }


@app.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = crud.get_user_by_username(
        db,
        form_data.username
    )

    if not user or not verify_password(
        form_data.password,
        user.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    token = create_access_token(user.username)

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@app.post("/projects")
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return crud.create_project(
        db,
        data.name,
        owner_id=current_user.id
    )


@app.post("/projects/{project_id}/tasks")
def create_task(
    project_id: int,
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return crud.create_task(
        db,
        project_id,
        data.title,
        data.status,
        data.assignee
    )


@app.get("/tasks")
def list_tasks(
    status: str = None,
    assignee: str = None,
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return crud.get_tasks(
        db,
        status,
        assignee,
        skip,
        limit
    )


@app.put("/tasks/{task_id}")
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    task = crud.update_task_status(
        db,
        task_id,
        data.status
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    return task


@app.delete("/tasks/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    task = crud.delete_task(db, task_id)

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    return {
        "message": "Task deleted"
    }