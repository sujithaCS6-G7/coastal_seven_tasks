import json
import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from task_manager import TaskManager


class TestTaskManager(unittest.TestCase):

    @patch("task_manager.get_connection")
    def test_add_task(self, mock_get_connection):
        mock_conn = MagicMock()
        mock_cur = MagicMock()

        mock_get_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cur

        tm = TaskManager()
        tm.add_task("Test Task", "Testing add", "pending", "high")

        mock_cur.execute.assert_called_once()
        mock_conn.commit.assert_called_once()
        mock_cur.close.assert_called_once()
        mock_conn.close.assert_called_once()

    @patch("task_manager.get_connection")
    def test_view_tasks(self, mock_get_connection):
        mock_conn = MagicMock()
        mock_cur = MagicMock()

        mock_get_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cur

        mock_cur.fetchall.return_value = [
            (1, "Test Task", "Testing view", "pending", "high")
        ]

        tm = TaskManager()
        tasks = tm.view_tasks()

        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].title, "Test Task")
        self.assertEqual(tasks[0].status, "pending")

    @patch("task_manager.get_connection")
    def test_update_task(self, mock_get_connection):
        mock_conn = MagicMock()
        mock_cur = MagicMock()

        mock_get_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cur

        mock_cur.rowcount = 1

        tm = TaskManager()
        tm.update_task(1, "completed")

        mock_cur.execute.assert_called_once()
        mock_conn.commit.assert_called_once()

    @patch("task_manager.get_connection")
    def test_delete_task(self, mock_get_connection):
        mock_conn = MagicMock()
        mock_cur = MagicMock()

        mock_get_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cur

        mock_cur.rowcount = 1

        tm = TaskManager()
        tm.delete_task(1)

        mock_cur.execute.assert_called_once()
        mock_conn.commit.assert_called_once()

    def test_export_to_json(self):
        tm = TaskManager()

        mock_task = MagicMock()
        mock_task.id = 1
        mock_task.title = "Test Task"
        mock_task.description = "Testing JSON"
        mock_task.status = "pending"
        mock_task.priority = "high"

        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = os.path.join(temp_dir, "test_tasks.json")

            with patch.object(tm, "view_tasks", return_value=[mock_task]):
                tm.export_to_json(file_path)

            with open(file_path, "r") as f:
                data = json.load(f)

            self.assertEqual(data[0]["id"], 1)
            self.assertEqual(data[0]["title"], "Test Task")
            self.assertEqual(data[0]["status"], "pending")


if __name__ == "__main__":
    unittest.main()