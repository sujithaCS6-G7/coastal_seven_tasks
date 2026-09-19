class Car:
    pass
car1 = Car()
car2 = Car()
print(car1)
print(car2)
print(type(car1))
print(car1 == car2)

class Car:
    def __init__(self, color, model):
        self.color = color
        self.model = model
car1 = Car("Red", "Swift")
car2 = Car("Blue", "Creta")
print(car1.color)
print(car1.model)
print(car2.color)
print(car2.model)

class student:
    def __init__(self,name,marks):     #init-object data
        self.name=name                   ## self-access attribute,method
        self.marks=marks
s1=student("sujitha",25)
s2=student("ravi",30)
print(s1.marks)
print(s2.name)

class Student:
    school_name = "ABC School"       #common  
    def __init__(self, name, marks):
        self.name = name              ##object specific
        self.marks = marks
s1 = Student("Sujitha", 85)
s2 = Student("Ravi", 90)
print(s1.name)
print(s2.name)
print(s1.school_name)
print(s2.school_name)
Student.school_name = "XYZ School"
print(s1.school_name)
print(s2.school_name)

class Student:
    def __init__(self, name, marks):
        self.name = name
        self.marks = marks
    def __str__(self):          # readable-return
        return f"Student: {self.name}, Marks: {self.marks}"
s1 = Student("Sujitha", 85)
print(s1)






class BankAccount:
    def __init__(self, owner, balance):
        self.owner = owner
        self.balance = balance
    def deposit(self, amount):
        self.balance = self.balance + amount
    def withdraw(self, amount):
        if amount <= self.balance:
            self.balance = self.balance - amount
        else:
            print("Insufficient balance")
    def show_balance(self):
        print(f"{self.owner}'s balance: {self.balance}")

class savingacc(BankAccount):
    def add_interest(self, rate):
        self.balance = self.balance + (self.balance * rate / 100)
acc1 = BankAccount("Sujitha", 1000)
acc1.deposit(500)
acc1.show_balance()
acc1.withdraw(2000)
acc1.withdraw(300)
acc1.show_balance()

acc2 = savingacc("Ravi", 2000)
acc2.deposit(1000)
acc2.show_balance()
acc2.add_interest(10)
acc2.show_balance()

class BankAccount:
    def __init__(self, owner, balance):
        self.owner = owner
        self.balance = balance
    def deposit(self, amount):
        self.balance = self.balance + amount
    def withdraw(self, amount):
        if amount <= self.balance:
            self.balance = self.balance - amount
        else:
            print("Insufficient balance")
    def show_balance(self):
        print(f"{self.owner}'s balance: {self.balance}")

class SavingsAccount(BankAccount):
    def __init__(self, owner, balance, interest_rate):
        super().__init__(owner, balance)        #access parent methods
        self.interest_rate = interest_rate

    def add_interest(self):
        self.balance = self.balance + (self.balance * self.interest_rate / 100)


acc1 = BankAccount("Sujitha", 1000)
acc1.deposit(500)
acc1.show_balance()
acc1.withdraw(2000)
acc1.withdraw(300)
acc1.show_balance()

acc2 = SavingsAccount("Ravi", 2000, 10)
acc2.deposit(1000)
acc2.show_balance()
acc2.add_interest()
acc2.show_balance()


class BankAccount:
    def __init__(self, owner, balance):
        self.owner = owner
        self.balance = balance
    def deposit(self, amount):
        self.balance = self.balance + amount
    def withdraw(self, amount):
        if amount <= self.balance:
            self.balance = self.balance - amount
        else:
            print("Insufficient balance")
    def show_balance(self):
        print(f"{self.owner}'s balance: {self.balance}")
class SavingsAccount(BankAccount):
    def __init__(self, owner, balance, interest_rate):
        super().__init__(owner, balance)
        self.interest_rate = interest_rate
    def add_interest(self):
        self.balance = self.balance + (
            self.balance * self.interest_rate / 100
        )

    def show_balance(self):
        super().show_balance()
        print(f"Interest rate: {self.interest_rate}%")


acc1 = BankAccount("Sujitha", 1000)
acc1.deposit(500)
acc1.show_balance()
acc2 = SavingsAccount("Ravi", 2000, 10)
acc2.deposit(1000)
acc2.add_interest()
acc2.show_balance()


class Dog:
    def sound(self):
        print("Bark")
class Cat:
    def sound(self):
        print("Meow")
d=Dog()
c=Cat()
animals = [d, c]
for animal in animals:
    animal.sound()


  
class BankAccount:   #p-same m,diff 
    def show(self):
        print("Normal account")
class SavingsAccount(BankAccount):
    def show(self):
        print("Savings account")
acc1 = BankAccount()
acc2 = SavingsAccount()
accounts = [acc1, acc2]
for acc in accounts:
    acc.show()


from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self):
        pass

class Circle(Shape):
    def __init__(self, radius):
        self.radius = radius

    def area(self):
        return 3.14 * self.radius * self.radius
class Square(Shape):
    def __init__(self, side):
        self.side = side

    def area(self):
        return self.side * self.side
c = Circle(5)
sq = Square(4)
print(c.area())
print(sq.area())