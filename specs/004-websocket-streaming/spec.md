# Spec — WebSocket State Streaming

## Problem

The dashboard polls `/state` and `/events` at 2Hz (500ms interval) even though nothing changed between most polls. This is listed as an intentional limitation in the README ("Polling vs. WebSockets"). Goal: replace the state/event polling loop with a server-pushed WebSocket stream while keeping REST for commands and configuration.

## Scope

IN scope:
- New `WS /ws/state` endpoint in `app/api/server.py` pushing `{type, ts, state, events}` snapshots at 5Hz.
- `useSimulatorStore` connects to the socket, applies pushed state/events, marks comms health from socket status, and auto-reconnects on loss.
- Backend test for the WS endpoint.
- README limitation bullet updated.

OUT of scope:
- Commands/tick/scenario/AI/report endpoints (remain HTTP request/response).
- Recipes/scenarios fetching (low-frequency config, remains HTTP).
- PLC scan endpoint (`/plc/*`) — separate integration path.
- Authentication, message compression, delta encoding.

## Constraints

- Message payload shape must keep existing consumers working: `state` matches `TAGS.snapshot()`, `events` matches `/events?limit=5` response items.
- No new dependencies (FastAPI/Starlette websockets only).
- React StrictMode double-mount safe: cleanup closes socket, no duplicate streams.
- All 159 backend tests pass; dashboard lint + build clean.

## Verification

- New pytest: WS connect → receive snapshot containing `state.machine_state` and `events` list.
- `npm run lint` and `npm run build` clean.
- Manual smoke optional (uvicorn + dashboard dev).
