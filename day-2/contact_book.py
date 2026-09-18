import json

def load_contacts():
    try:
        with open("contacts.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save_contacts(contacts):
    with open("contacts.json", "w") as f:
        json.dump(contacts, f)

def add_contact(contacts, name, phone):
    contacts[name] = phone
    save_contacts(contacts)
    print(f"{name} added!")

def view_contacts(contacts):
    for name, phone in contacts.items():
        print(name, ":", phone)

def delete_contact(contacts, name):
    if name in contacts:
        del contacts[name]
        save_contacts(contacts)
        print(f"{name} deleted!")
    else:
        print("Contact not found!")

contacts = load_contacts()

add_contact(contacts, "Ravi", "9998887770")
view_contacts(contacts)
delete_contact(contacts, "Ravi")
view_contacts(contacts)