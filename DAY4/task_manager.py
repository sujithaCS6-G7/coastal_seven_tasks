import logging
import json

from db import get_connection
from task import Task


logging.basicConfig(
    filename="task_manager.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)


class TaskManager:

    def add_task(self, title, description, status, priority):
        try:
            conn = get_connection()
            cur = conn.cursor()

            cur.execute(
                "INSERT INTO tasks (title, description, status, priority) VALUES (%s, %s, %s, %s)",
                (title, description, status, priority)
            )

            conn.commit()
            cur.close()
            conn.close()

            logging.info(f"Task added: {title}")
            print("Task added!")

        except Exception as e:
            logging.error(f"Error adding task: {e}")
            print(f"Error adding task: {e}")

    def view_tasks(self):
        try:
            conn = get_connection()
            cur = conn.cursor()

            cur.execute(
                "SELECT id, title, description, status, priority FROM tasks"
            )

            rows = cur.fetchall()

            cur.close()
            conn.close()

            tasks = []

            for row in rows:
                t = Task(row[0], row[1], row[2], row[3], row[4])
                tasks.append(t)

            logging.info(f"Viewed {len(tasks)} tasks")
            return tasks

        except Exception as e:
            logging.error(f"Error viewing tasks: {e}")
            print(f"Error viewing tasks: {e}")
            return []

    def update_task(self, task_id, status):
        try:
            conn = get_connection()
            cur = conn.cursor()

            cur.execute(
                "UPDATE tasks SET status = %s WHERE id = %s",
                (status, task_id)
            )

            if cur.rowcount == 0:
                logging.warning(f"Task not found for update: {task_id}")
                print("Task not found!")
            else:
                conn.commit()
                logging.info(f"Task updated: {task_id}")
                print("Task updated!")

            cur.close()
            conn.close()

        except Exception as e:
            logging.error(f"Error updating task: {e}")
            print(f"Error updating task: {e}")

    def delete_task(self, task_id):
        try:
            conn = get_connection()
            cur = conn.cursor()

            cur.execute(
                "DELETE FROM tasks WHERE id = %s",
                (task_id,)
            )

            if cur.rowcount == 0:
                logging.warning(f"Task not found for delete: {task_id}")
                print("Task not found!")
            else:
                conn.commit()
                logging.info(f"Task deleted: {task_id}")
                print("Task deleted!")

            cur.close()
            conn.close()

        except Exception as e:
            logging.error(f"Error deleting task: {e}")
            print(f"Error deleting task: {e}")

    def export_to_json(self, filename="tasks_export.json"):
        try:
            tasks = self.view_tasks()

            data = []

            for t in tasks:
                data.append({
                    "id": t.id,
                    "title": t.title,
                    "description": t.description,
                    "status": t.status,
                    "priority": t.priority
                })

            with open(filename, "w") as f:
                json.dump(data, f, indent=4)

            logging.info(f"Exported {len(data)} tasks to {filename}")
            print(f"Exported to {filename}")

        except Exception as e:
            logging.error(f"Error exporting tasks: {e}")
            print(f"Error exporting: {e}")
    def category_task_count(self):
        try:
            conn = get_connection()
            cur = conn.cursor()

            cur.execute("""
                SELECT categories.name, COUNT(tasks.id)
                FROM tasks
                JOIN categories
                ON tasks.category_id = categories.id
                GROUP BY categories.name
            """)

            rows = cur.fetchall()

            cur.close()
            conn.close()

            for row in rows:
                print(f"{row[0]}: {row[1]} tasks")

        except Exception as e:
            logging.error(f"Error getting category count: {e}")
            print(f"Error getting category count: {e}")