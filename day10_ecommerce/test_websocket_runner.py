"""Standalone WebSocket testing runner for Day 10 real-time order tracking feed.

Verifies:
1. Live WebSocket handshake on ws://localhost:8000/ws/orders/{user_id}
2. Initial CONNECTED payload verification
3. Bidirectional ping-pong message exchange
4. Clean disconnect handling
"""

import asyncio
import json
import sys
import websockets


async def test_order_tracking_websocket(user_id: int = 1, host: str = "localhost", port: int = 8000):
    uri = f"ws://{host}:{port}/ws/orders/{user_id}"
    print(f"\n=======================================================")
    print(f"Testing WebSocket Endpoint: {uri}")
    print(f"=======================================================")

    try:
        async with websockets.connect(uri) as ws:
            print("[1/3] Connected to WebSocket endpoint.")

            # 1. Receive initial welcome handshake
            raw_handshake = await asyncio.wait_for(ws.recv(), timeout=5.0)
            handshake = json.loads(raw_handshake)
            print(f"[2/3] Received Handshake Frame:")
            print(f"      Event:   {handshake.get('event')}")
            print(f"      User ID: {handshake.get('user_id')}")
            print(f"      Message: {handshake.get('message')}")

            assert handshake.get("event") == "CONNECTED", "Handshake event mismatch"
            assert handshake.get("user_id") == user_id, "User ID mismatch"

            # 2. Test bidirectional Ping/Pong
            ping_payload = {"action": "ping"}
            print(f"[3/3] Sending Ping: {ping_payload}")
            await ws.send(json.dumps(ping_payload))

            raw_pong = await asyncio.wait_for(ws.recv(), timeout=5.0)
            pong = json.loads(raw_pong)
            print(f"      Received Pong Frame: {pong}")
            assert pong.get("event") == "pong", "Pong event mismatch"

            print("\n-------------------------------------------------------")
            print(">>> ALL WEBSOCKET TESTS PASSED SUCCESSFULLY! (2/2 FRAMES)")
            print("-------------------------------------------------------\n")
            return True

    except Exception as exc:
        print(f"\n[ERROR] WebSocket Test Failed: {exc}")
        return False


if __name__ == "__main__":
    success = asyncio.run(test_order_tracking_websocket(user_id=1))
    sys.exit(0 if success else 1)
