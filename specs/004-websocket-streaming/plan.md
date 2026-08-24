# Plan — WebSocket State Streaming

## Backend (`app/api/server.py`)

```python
WS_PUSH_INTERVAL_SEC = 0.2  # 5 Hz push rate

@app.websocket("/ws/state")
async def ws_state(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            events = SIM.event_logger.get_recent(5)
            payload = {
                "type": "state",
                "ts": datetime.now(timezone.utc).isoformat(),
                "state": TAGS.snapshot(),
                "events": [e.__dict__ for e in reversed(events)],
            }
            await websocket.send_json(payload)
            await asyncio.sleep(WS_PUSH_INTERVAL_SEC)
    except WebSocketDisconnect:
        pass
```

- Import `WebSocket`, `WebSocketDisconnect`, `asyncio`, `datetime`.
- REST endpoints unchanged; `/state` and `/events` remain for compatibility and tooling.

## Frontend (`app/dashboard/src/hooks/useSimulator.ts`)

- Derive WS URL: `API_BASE.replace('http', 'ws') + '/ws/state'`.
- Replace the 500ms polling `setInterval` effect with a socket lifecycle effect:
  - `connect()` opens WebSocket; `onmessage` parses payload → `setState(payload.state)`, `setEvents(payload.events)`, `setIsCommsHealthy(true)`.
  - `onclose`/`onerror` → `setIsCommsHealthy(false)` and schedule reconnect after 1s unless unmounting (guard via local `disposed` flag + ref).
  - Cleanup clears reconnect timer and closes socket.
- Keep initial `fetchScenarios`/`fetchRecipes`; drop initial `fetchState`/`fetchEvents` (first push arrives immediately).
- Keep all command callbacks as-is (HTTP POST); their returned `state` still updates the store optimistically.

## Tests

- `tests/test_api.py` (or new `tests/test_ws.py`): use `TestClient.websocket_connect("/ws/state")`, receive one JSON message, assert keys and content types.

## Risks

- TestClient websocket runs the handler until disconnect; test closes from client side — standard pattern, no hang expected.
- Reconnect storm if server down: fixed 1s delay, single socket, acceptable for dev tool.
