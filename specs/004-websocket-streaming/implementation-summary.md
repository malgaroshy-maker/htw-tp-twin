# Implementation Summary — WebSocket State Streaming

## Result

Dashboard state/event polling replaced with a server-pushed WebSocket stream. Commands remain HTTP request/response.

## Changes

### Backend
- `app/api/server.py`
  - New `WS /ws/state` endpoint: accepts a client, pushes `{type, ts, state, events}` every 200ms (5Hz). `state` is the full `TAGS.snapshot()`; `events` mirrors `/events?limit=5` (newest first). Clean `WebSocketDisconnect` handling.
  - Removed two pre-existing unused imports (`os`, `load_recipes`) flagged by ruff in the same file.

### Frontend
- `app/dashboard/src/hooks/useSimulator.ts`
  - Polling `setInterval` (500ms) removed. New socket lifecycle effect: connects to `ws://…/ws/state`, applies pushed `state`/`events`, sets comms health from socket status.
  - Auto-reconnect after 1s on close; StrictMode-safe cleanup (`disposed` flag, timer clear, `onclose` detached before `close()`).
  - Initial `fetchState`/`fetchEvents` dropped (first push arrives immediately); recipes/scenarios still fetched over HTTP once.
  - All command/tick/AI/report callbacks unchanged.

### Docs & Tests
- README limitation bullet updated: streaming at 5Hz via `/ws/state`.
- `tests/test_api.py`: new `test_ws_state_stream` asserting payload contract (`type`, `ts`, `state.sts.machine_state`, `events` list).

## Verification Evidence

| Check | Result |
|---|---|
| `pytest -q` | 160 passed (159 + new WS test) |
| `ruff check app/api/server.py` | All checks passed |
| `npm run lint` | Clean |
| `npm run build` | Succeeds (pre-existing chunk-size warning from 3D scene only) |

## Notes

- REST `/state` and `/events` endpoints retained for compatibility and tooling.
- Fixed-interval push chosen over push-on-change (P2 item in checklist) — simpler, sufficient at 5Hz, snapshot cost is trivial.
- Chunk-size build warning predates this change (3D scene bundle), out of scope.
