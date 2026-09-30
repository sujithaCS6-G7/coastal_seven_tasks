import asyncio
import time

async def task1():
    await asyncio.sleep(2)
    print("Task 1 Completed")

async def task2():
    await asyncio.sleep(2)
    print("Task 2 Completed")

async def main():
    start = time.time()

    await asyncio.gather(
        task1(),
        task2()
    )

    end = time.time()
    print("Time Taken:", end - start)

asyncio.run(main())