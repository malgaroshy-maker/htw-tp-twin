# Checklist — WebSocket State Streaming

## P0 (must pass)
- [x] `WS /ws/state` pushes `{type, ts, state, events}` at 5Hz — verified by test_ws_state_stream
- [x] Payload `state` matches `TAGS.snapshot()` shape; `events` matches `/events?limit=5` items
- [x] Disconnect handled cleanly (`except WebSocketDisconnect: pass`)
- [x] Frontend applies pushed state/events; comms health reflects socket status
- [x] Auto-reconnect after 1s; StrictMode-safe cleanup (disposed flag, timer clear, onclose detached)
- [x] Commands/tick still work over HTTP — untouched callbacks, test_api.py green
- [x] pytest green (160 passed)
- [x] ruff clean on touched backend files
- [x] npm run lint clean
- [x] npm run build succeeds

## P1 (should)
- [x] README limitation updated ("Live Streaming" bullet)
- [x] No new dependencies introduced

## P2 (nice)
- [ ] Push-on-change instead of fixed interval (deferred — fixed 5Hz is sufficient and simpler)
