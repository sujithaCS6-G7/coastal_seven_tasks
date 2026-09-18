import json
data = {"name": "Sujitha", "age": 22, "city": "Hyderabad"}
with open("data.json", "w") as f:
    json.dump(data, f)      ## dump-write data
print("File saved!")

with open("data.json", "r") as f:
    loaded_data = json.load(f)     ## load -read
print(loaded_data)
print(loaded_data["name"])
print(loaded_data["age"])