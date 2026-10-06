"""WebSocket router for live order tracking and connection monitoring."""

import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse

from app.services.order_service import ws_order_manager

router = APIRouter(prefix="/ws", tags=["WebSockets"])


@router.websocket("/orders/{user_id}")
async def order_updates_websocket(websocket: WebSocket, user_id: int):
    """Real-time bidirectional WebSocket stream for user order notifications."""
    await ws_order_manager.connect(websocket, user_id)
    try:
        # Send initial connection handshake
        await websocket.send_text(
            json.dumps(
                {
                    "event": "CONNECTED",
                    "user_id": user_id,
                    "message": "Connected to real-time order tracking feed.",
                }
            )
        )
        while True:
            # Keep connection open and echo client heartbeats/messages
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                if parsed.get("action") == "ping":
                    await websocket.send_text(json.dumps({"event": "pong"}))
            except Exception:
                await websocket.send_text(json.dumps({"event": "echo", "data": data}))
    except WebSocketDisconnect:
        ws_order_manager.disconnect(websocket, user_id)


@router.get(
    "/status",
    summary="WebSocket Service Status",
)
def get_websocket_status():
    """Retrieve active WebSocket connection count and health status."""
    return {
        "status": "online",
        "active_connections": ws_order_manager.get_active_count(),
        "rooms": list(ws_order_manager.active_connections.keys()),
    }


@router.get(
    "/tracker",
    response_class=HTMLResponse,
    summary="Live Order Tracker & WebSocket Dashboard",
)
def get_live_tracker_ui():
    """Interactive visual dashboard to monitor real-time WebSocket order events and Celery email tasks."""
    return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Live Order Tracking & Celery Monitor</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --purple: #8b5cf6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background-color: var(--bg); color: var(--text); padding: 24px; line-height: 1.5; }
    .container { max-width: 1000px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; margin-bottom: 24px; }
    h1 { font-size: 1.5rem; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 10px; }
    .status-badge { display: inline-flex; align-items: center; gap: 8px; font-size: 0.85rem; padding: 6px 14px; border-radius: 9999px; background: rgba(16, 185, 129, 0.15); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.3); font-weight: 600; }
    .status-badge.disconnected { background: rgba(239, 68, 68, 0.15); color: var(--danger); border-color: rgba(239, 68, 68, 0.3); }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
    .card h2 { font-size: 1.1rem; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; }
    .control-row { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; }
    input[type="number"] { background: #0f172a; border: 1px solid var(--border); color: #fff; padding: 8px 12px; border-radius: 6px; width: 100px; font-size: 0.9rem; }
    .btn { background: var(--primary); color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
    .btn:hover { background: var(--primary-hover); }
    .btn-secondary { background: #334155; }
    .btn-secondary:hover { background: #475569; }
    .btn-danger { background: var(--danger); }
    .btn-danger:hover { background: #dc2626; }
    .console-logs { background: #0b0f19; border: 1px solid var(--border); border-radius: 8px; padding: 14px; height: 350px; overflow-y: auto; font-family: 'Consolas', monospace; font-size: 0.85rem; }
    .log-item { margin-bottom: 10px; padding: 8px; border-radius: 6px; background: rgba(255, 255, 255, 0.03); border-left: 3px solid var(--primary); }
    .log-item.event-CONNECTED { border-color: var(--success); }
    .log-item.event-ORDER_CREATED { border-color: var(--purple); }
    .log-item.event-ORDER_STATUS_UPDATED { border-color: var(--warning); }
    .log-item.event-pong { border-color: #64748b; }
    .log-time { color: var(--text-muted); font-size: 0.75rem; margin-right: 6px; }
    .log-tag { font-weight: bold; text-transform: uppercase; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; background: rgba(255, 255, 255, 0.1); margin-right: 8px; }
    .steps-box { background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; padding: 14px; font-size: 0.85rem; line-height: 1.6; }
    .steps-box ol { margin-left: 20px; }
    .steps-box code { background: #0f172a; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #93c5fd; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>📡 Real-Time Order Tracking & Celery Live Monitor</h1>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 4px;">Day 10 E-Commerce Mini Project &bull; Live WebSocket Stream</p>
      </div>
      <div id="wsBadge" class="status-badge disconnected">
        <span class="status-dot"></span>
        <span id="wsStatusText">Disconnected</span>
      </div>
    </header>

    <div class="grid">
      <!-- Connection Controls & Swagger Execution Guide -->
      <div class="card">
        <h2><span>WebSocket Controls</span></h2>
        <div class="control-row">
          <label for="userIdInput" style="font-size: 0.85rem; color: var(--text-muted);">User ID:</label>
          <input type="number" id="userIdInput" value="1" min="1">
          <button id="connectBtn" class="btn">Connect</button>
          <button id="disconnectBtn" class="btn btn-danger" style="display: none;">Disconnect</button>
          <button id="pingBtn" class="btn btn-secondary">Send Ping</button>
        </div>

        <h2 style="margin-top: 24px;"><span>How to Test from Swagger UI</span></h2>
        <div class="steps-box">
          <p><strong>1. Connect WebSocket:</strong> Keep this tab open with your <code>User ID</code> connected above.</p>
          <p style="margin-top: 8px;"><strong>2. Open Swagger UI:</strong> In another tab, open <a href="/docs" target="_blank" style="color: #60a5fa; text-decoration: underline;">/docs</a>.</p>
          <p style="margin-top: 8px;"><strong>3. Place an Order:</strong></p>
          <ol>
            <li>Authorize with your user token in Swagger.</li>
            <li>Add item: <code>POST /cart/items</code> (e.g. product 1, qty 1).</li>
            <li>Checkout: <code>POST /orders/checkout</code>.</li>
          </ol>
          <p style="margin-top: 8px;"><strong>4. Watch Real-Time Action:</strong></p>
          <ul style="margin-left: 20px; margin-top: 4px;">
            <li><strong>WebSocket:</strong> Instantly receives <code>ORDER_CREATED</code> in the live feed on the right!</li>
            <li><strong>Celery:</strong> Asynchronously dispatches <code>send_order_confirmation_email</code> in the background!</li>
            <li><strong>Admin Update:</strong> Call <code>PUT /orders/{id}/status</code> (e.g. <code>SHIPPED</code>) ➔ live event appears instantly!</li>
          </ul>
        </div>
      </div>

      <!-- Live Event Feed Terminal -->
      <div class="card">
        <h2>
          <span>Live WebSocket Feed</span>
          <button id="clearBtn" class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.75rem;">Clear Logs</button>
        </h2>
        <div id="logs" class="console-logs">
          <div class="log-item" style="border-color: #64748b;">
            <span class="log-time">[System]</span>
            <span>Click <strong>Connect</strong> above to listen for real-time order events.</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    let ws = null;
    const wsBadge = document.getElementById("wsBadge");
    const wsStatusText = document.getElementById("wsStatusText");
    const userIdInput = document.getElementById("userIdInput");
    const connectBtn = document.getElementById("connectBtn");
    const disconnectBtn = document.getElementById("disconnectBtn");
    const pingBtn = document.getElementById("pingBtn");
    const clearBtn = document.getElementById("clearBtn");
    const logsContainer = document.getElementById("logs");

    function logEvent(event, data) {
      const item = document.createElement("div");
      item.className = `log-item event-${event}`;
      const now = new Date().toLocaleTimeString();
      item.innerHTML = `<span class="log-time">[${now}]</span><span class="log-tag">${event}</span> ${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`;
      logsContainer.appendChild(item);
      logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    function connect() {
      const userId = userIdInput.value || 1;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws/orders/${userId}`;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        wsBadge.className = "status-badge";
        wsStatusText.textContent = `Connected (User #${userId})`;
        connectBtn.style.display = "none";
        disconnectBtn.style.display = "inline-block";
        userIdInput.disabled = true;
      };

      ws.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          logEvent(payload.event || "MESSAGE", payload);
        } catch (err) {
          logEvent("RAW", e.data);
        }
      };

      ws.onclose = () => {
        wsBadge.className = "status-badge disconnected";
        wsStatusText.textContent = "Disconnected";
        connectBtn.style.display = "inline-block";
        disconnectBtn.style.display = "none";
        userIdInput.disabled = false;
        logEvent("SYSTEM", "WebSocket connection closed.");
      };

      ws.onerror = (err) => {
        logEvent("ERROR", "WebSocket encountered an error.");
      };
    }

    function disconnect() {
      if (ws) {
        ws.close();
      }
    }

    connectBtn.addEventListener("click", connect);
    disconnectBtn.addEventListener("click", disconnect);
    pingBtn.addEventListener("click", () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: "ping" }));
        logEvent("CLIENT", "Sent ping");
      } else {
        alert("Please connect the WebSocket first!");
      }
    });

    clearBtn.addEventListener("click", () => {
      logsContainer.innerHTML = "";
    });

    // Auto connect on load
    connect();
  </script>
</body>
</html>
"""
