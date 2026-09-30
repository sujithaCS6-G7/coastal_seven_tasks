import unittest
from task import Task


class TestTask(unittest.TestCase):

    def test_task_creation(self):
        t = Task(1, "Sample", "Description", "pending", "high")

        self.assertEqual(t.id, 1)
        self.assertEqual(t.title, "Sample")
        self.assertEqual(t.status, "pending")

    def test_task_str(self):
        t = Task(1, "Sample", "Description", "pending", "high")

        expected = "[1] Sample - pending (high)"

        self.assertEqual(str(t), expected)


if __name__ == "__main__":
    unittest.main()