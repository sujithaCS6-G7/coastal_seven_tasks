from pydantic import BaseModel, Field, EmailStr, model_validator


class Address(BaseModel):
    city: str
    pincode: int


class User(BaseModel):
    id: int
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    age: int = Field(..., gt=0, lt=120)
    address: Address

    @model_validator(mode="after")
    def check_age(self):
        if self.age < 18:
            raise ValueError("User must be 18 or older")
        return self