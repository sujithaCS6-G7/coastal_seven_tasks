class Task:
    def __init__(self, id, title, description, status, priority):
        self.id = id         ##########oject
        self.title = title
        self.description = description
        self.status = status
        self.priority = priority

    def __str__(self):
        return f"[{self.id}] {self.title} - {self.status} ({self.priority})"