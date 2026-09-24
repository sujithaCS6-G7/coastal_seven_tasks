from pydantic import BaseModel

class ProjectCreate(BaseModel):
    name: str

class TaskCreate(BaseModel):
    title: str
    status: str = "pending"
    assignee: str = None

class TaskUpdate(BaseModel):
    status: str