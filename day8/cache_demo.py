import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Save data for 10 seconds
r.set("course", "Python", ex=10)

print("Stored:", r.get("course"))