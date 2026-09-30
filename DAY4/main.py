from task_manager import TaskManager

tm = TaskManager()

while True:
    print("\n--- Task Manager ---")
    print("1. Add Task")
    print("2. View Tasks")
    print("3. Update Task Status")
    print("4. Delete Task")
    print("5. Exit")
    print("6. Export to JSON")
    print("7. Category-wise Task Count")

    choice = input("Enter choice: ")

    if choice == "1":
        title = input("Title: ")
        description = input("Description: ")
        status = input("Status (pending/completed): ")
        priority = input("Priority (low/medium/high): ")

        if not title.strip():
            print("Title cannot be empty!")

        elif status not in ["pending", "completed"]:
            print("Invalid status!")

        elif priority not in ["low", "medium", "high"]:
            print("Invalid priority!")

        else:
            tm.add_task(title, description, status, priority)

    elif choice == "2":
        tasks = tm.view_tasks()

        for t in tasks:
            print(t)

    elif choice == "3":
        task_id = input("Enter Task ID to update: ")
        new_status = input("New status (pending/completed): ")

        if new_status not in ["pending", "completed"]:
            print("Invalid status!")
        else:
            tm.update_task(task_id, new_status)

    elif choice == "4":
        task_id = input("Enter Task ID to delete: ")

        tm.delete_task(task_id)

    elif choice == "5":
        print("Goodbye!")
        break

    elif choice == "6":
        tm.export_to_json()

    elif choice == "7":
        tm.category_task_count()

    else:
        print("Invalid choice, try again.")