i = 1
while i <=10:
    if i % 2 == 0:
        print(i)
    i = i + 1



for i in range(1,20):
    if i%3==0:
        i=i+1
        continue
    if i==15:
        break
    else:
        print(i)


for i in range(1, 20):
    if i == 15:    # stop after 15
        break
    if i % 3 == 0:      #print remain of 3
        continue
    print(i)



for i in range(1, 21):
    if i == 15:                    ## to skip only 15
        continue
    if i % 3 == 0:
        print(i)


for i in range(5):
    if i == 3:
        pass   
    print(i)

n=[]
for i in range(1,10):
    if i%2==0:
        n.append(i)
print(n)

n = [i for i in range(1, 11) if i % 2 == 0]            ##List comprehension
print(n)


def mul(*n):
    t=1
    for i in n:
        t=t*i
    return t
print(mul(2,3))



def A(numbers):
    total = sum(numbers)
    avg = total / len(numbers)
    count = len(numbers)
    return total, avg, count

s, a, c = A([10, 20, 30])
print(s, a, c)



big = lambda a, b: a if a > b else b

print(big(50,20))


balance = 1000

def withdraw(amount):
    global balance
    balance = balance - amount
    print(balance)
withdraw(400)



for i in range(1, 21):
    if i % 3 == 0 and i % 5 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)


n = int(input("Enter number: "))
is_prime = True
for i in range(2, n):
    if n % i == 0:
        is_prime = False
        break
if is_prime:
    print("Prime")
else:
    print("Not Prime")


numbers = [15, 3, 9, 42, 7]  ##list
print(numbers[0])
print(numbers[-1])
print(numbers[1:4])

person = ("Sujitha", 22, "Hyderabad")
print(person[0])

name, age, city = person
print(name)
print(age)
print(city)


set1 = {10, 20, 30, 40}
set2 = {30, 40, 50, 60}
print(set1 | set2)
print(set1 & set2)
print(set1 - set2)
print(set2 - set1)
set1.add(99)
print(set1)


student = {
    "name": "sujita",
    "age": 20
}
print(student.get("city", "Not Available"))
print(student.keys())
print(student.values())

cubes = {}
for x in range(1, 6):
    cubes[x] = x * x * x
print(cubes)

cubes = {x: x*x*x for x in range(1, 6)}
print(cubes)

matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
print(matrix[1][2])

students = {
    1: {"name": "Ravi", "age": 21},
    2: {"name": "Sujitha", "age": 22}
}
for id, student in students.items():
    print(student["name"])
    print(student.items())
student.items()



