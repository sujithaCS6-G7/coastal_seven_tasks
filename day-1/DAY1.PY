#calculator
a=int(input("enter  1st no:"))
b=int(input("enter 2nd no:"))
op = input("Enter operator (+, -, *, /): ")
if op == "+":
    print(a+b)
elif op =="-":
    print(a-b)
elif op =="*":
    print(a*b)
elif op == "/":
    print(a/b)
else:
    print("invalid")

#### Even/Odd Checker.
a=int(input("enter num"))
if a%2==0:
    print("even num")
else :
    print("odd num")

# Largest of Two/Three Numbers.
s=int(input('enter1 no:'))
u=int(input('enter2 no:'))
j=int(input('enter2 no:'))
if (s>u) and(s>j):
    print("s is larger")
elif (u>j) and (u>s):
    print(" u is larger")
elif (j>u) and (j>s):
    print(" j is larger")
else:
    print('smaller')
     

s=int(input('enter1 no:'))
u=int(input('enter2 no:'))
j=int(input('enter2 no:'))
if s > u:
    if s > j:
        print("s is larger")
    else:
        print("j is larger")
else:
    if u > j:
        print("u is larger")
    else:
        print("j is larger")


# ##List Operations
z=[10,20,30,50,40,60,80]
for i in z:
    print(i)
print(sum(z))
print(max(z))
print(min(z))
print(len(z))


student = {
    "name": "Sujitha",
    "age": 22,
    "marks": 75,
    "city": "gnt"
}
student["grade"]="A"     # add
student["age"]=21        #update
del student["marks"]     #del
print(student)
print(student.items())   #items
for key, value in student.items():  # loop
    print(key, value)


# Student Grade Calculator
marks = int(input("Enter marks: "))
if marks >= 90:
    print("A")
elif marks >= 75:
    print("B")
elif marks >= 60:
    print("C")
elif marks >= 40:
    print("D")
else:
    print("Fail")

Name=input("enter name")
marks = int(input("Enter marks: "))
if marks >= 90:
    print("A")
elif marks >= 75:
    print("B")
elif marks >= 60:
    print("C")
elif marks >= 40:
    print(f"{Name}, your grade is: ")
else:
    print("Fail")

### func
def is_even(num):
    if num %2==0:
        return True
    else: 
        return False
print(is_even(4))
print(is_even(7))



#calculator
def calculator(a, b, op):
    if op == "+":
        return a + b
    elif op == "-":
        return a - b
    elif op == "*":
        return a * b
    elif op == "/":
        return a / b
    else:
        return "Invalid operator"

a = int(input("enter 1st no: "))
b = int(input("enter 2nd no: "))
op = input("Enter operator (+, -, *, /): ")
result = calculator(a, b, op)
print(result)