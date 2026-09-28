import redis
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

r.set("name", "Sujitha", ex=5)

print("Immediately :", r.get("name"))

time.sleep(6)

print("After 6 seconds :", r.get("name"))