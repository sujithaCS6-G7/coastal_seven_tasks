from tasks import long_task

result = long_task.delay()

print("Task ID:", result.id)
print("Task sent successfully!")