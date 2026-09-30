try:
    num = int(input("Enter a number: "))
    print(100 / num)
except ValueError:
    print("Please enter a valid number!")
except ZeroDivisionError:
    print("Cannot divide by zero!")