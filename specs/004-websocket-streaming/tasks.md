# Tasks — WebSocket State Streaming

- [x] T1: Backend — add `WS /ws/state` push endpoint (5Hz, state + recent events)
- [x] T2: Backend test — WS snapshot contract (`test_ws_state_stream`)
- [x] T3: Frontend — replace polling loop with socket lifecycle + reconnect in useSimulatorStore
- [x] T4: README — "Live Streaming" limitation bullet replaces polling note
- [x] T5: Verify — pytest 160 passed; ruff clean; npm lint clean; npm build succeeds
- [x] T6 (added): Remove pre-existing unused imports in server.py (`os`, `load_recipes`) so lint gate passes
