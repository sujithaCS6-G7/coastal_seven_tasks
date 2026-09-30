from sqlalchemy.orm import Session
from models import Project, Task, User


def create_user(db: Session, username: str, hashed_password: str):
    user = User(
        username=username,
        password=hashed_password,
        role="user"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()


def create_project(db: Session, name: str, owner_id: int):
    project = Project(
        name=name,
        owner_id=owner_id
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def create_task(
    db: Session,
    project_id: int,
    title: str,
    status: str,
    assignee: str
):
    task = Task(
        title=title,
        status=status,
        project_id=project_id,
        assignee=assignee
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def get_tasks(
    db: Session,
    status: str = None,
    assignee: str = None,
    skip: int = 0,
    limit: int = 10
):
    query = db.query(Task)

    if status:
        query = query.filter(Task.status == status)

    if assignee:
        query = query.filter(Task.assignee == assignee)

    return query.offset(skip).limit(limit).all()


def update_task_status(
    db: Session,
    task_id: int,
    status: str
):
    task = db.query(Task).filter(Task.id == task_id).first()

    if task:
        task.status = status
        db.commit()
        db.refresh(task)

    return task


def delete_task(db: Session, task_id: int):
    task = db.query(Task).filter(Task.id == task_id).first()

    if task:
        db.delete(task)
        db.commit()

    return task