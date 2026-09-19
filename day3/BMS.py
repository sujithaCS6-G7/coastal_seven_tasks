from abc import ABC, abstractmethod
class Account(ABC):                         # ABC + Abstraction
    def __init__(self, owner, balance):
        self._owner = owner
        self._balance = balance             # Encapsulation
    @property                                # Encapsulation
    def balance(self):
        return self._balance
    @abstractmethod                          # Abstraction
    def withdraw(self, amount):
        pass
    def deposit(self, amount):
        self._balance = self._balance + amount
    def __str__(self):                       # Dunder method
        return f"{self._owner}'s balance: {self._balance}"
class SavingsAccount(Account):               # Inheritance
    def __init__(self, owner, balance, interest_rate):
        super().__init__(owner, balance)     # super()
        self.interest_rate = interest_rate
    def withdraw(self, amount):              # Method Overriding
        if amount <= self._balance:
            self._balance = self._balance - amount
            print("Savings withdrawal successful")
        else:
            print("Insufficient balance")
    def add_interest(self):
        self._balance = self._balance + (
            self._balance * self.interest_rate / 100
        )
class CurrentAccount(Account):               # Inheritance
    def __init__(self, owner, balance, overdraft_limit):
        super().__init__(owner, balance)     # super()
        self.overdraft_limit = overdraft_limit
    def withdraw(self, amount):              # Method Overriding
        if amount <= self._balance + self.overdraft_limit:
            self._balance = self._balance - amount
            print("Current account withdrawal successful")
        else:
            print("Overdraft limit exceeded")
s1 = SavingsAccount("Sujitha", 1000, 5)     # Object
c1 = CurrentAccount("Ravi", 1000, 500)       # Object
accounts = [s1, c1]                          # Polymorphism
for acc in accounts:
    print(acc)                               # Polymorphism
s1.withdraw(1500)
c1.withdraw(1500)                            # Polymorphism