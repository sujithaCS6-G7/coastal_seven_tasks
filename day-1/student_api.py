from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class Student(BaseModel):
    name: str
    age: int
    marks: float

students = {}

@app.get("/")
def home():
    return {"message": "Hello, FastAPI"}

@app.get("/students")
def get_all_students():
    return students

@app.get("/students/{student_id}")
def get_student(student_id: int):
    if student_id in students:
        return students[student_id]
    raise HTTPException(status_code=404, detail="Student not found")

@app.post("/students/{student_id}")
def create_student(student_id: int, student: Student):
    if student_id in students:
        raise HTTPException(status_code=400, detail="Student already exists")
    students[student_id] = student
    return {"message": "Student created", "data": student}

@app.put("/students/{student_id}")
def update_student(student_id: int, student: Student):
    if student_id not in students:
        raise HTTPException(status_code=404, detail="Student not found")
    students[student_id] = student
    return {"message": "Student updated", "data": student}

@app.delete("/students/{student_id}")
def delete_student(student_id: int):
    if student_id not in students:
        raise HTTPException(status_code=404, detail="Student not found")
    del students[student_id]
    return {"message": "Student deleted"}