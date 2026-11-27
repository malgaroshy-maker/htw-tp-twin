# Spec — OPC UA Bridge

## Problem

The roadmap's final integration gap: expose the machine to real PLC/SCADA-style clients via OPC UA. The formal contract already exists — `POST /plc/scan` implements the deterministic scan cycle (commands in → permissives → deterministic integer-coded `PlcSnapshot` out), and `docs/specs/PLC_Tag_List.md` §19 defines the target namespace shape (`/Commands`, `/Inputs`, `/Status`, `/Outputs`, `/Faults`, `/Events`).

## Decision

Standalone **bridge process** (`python -m app.integration.opcua_server`) rather than embedding in uvicorn:

- Keeps the API process untouched (no port/lifespan side effects, tests unaffected).
- Exercises the full designed chain: OPC UA client → bridge → `/plc/scan` contract → controller → simulator — exactly the "PLC-supervised mode" from `PLC_Sim_Connection_Spec.md`.
- Library: `asyncua` (opcua-asyncio, actively maintained; API verified via Context7). HTTP transport: `httpx` (already in venv via starlette).

## Scope

IN scope:
- `app/integration/opcua_server.py`: `OpcUaBridge` (asyncua server + scan loop) plus pure functions `build_scan_request()` / consumable-pulse handling for testability.
- Namespace mirroring the integer-coded `PlcSnapshot`: Commands (writable pulses + RecipeSelect string), Inputs (writable bools), Status, Outputs, Faults, Warnings, Sensors, Diagnostics folders.
- Env-configurable: `TRAYPACKER_API_URL`, `OPCUA_ENDPOINT`, `OPCUA_SCAN_INTERVAL_SEC` (default 0.1s to match the fixed dt=0.1 in `/plc/scan` so sim time ≈ wall time), `OPCUA_ALLOW_SAFETY_WRITES` (default unset; `1` makes `safety_ok`, `estop_ok`, `guards_closed`, `utilities_ok` writable by clients).
- pyproject: add `asyncua`, `httpx`; register `app.integration` package.
- Logic tests for command translation and snapshot→node mapping (no socket binding in CI).
- README run instructions.

OUT of scope:
- Subscriptions/datachange callbacks (poll-based reads are sufficient and simpler).
- Security/certificates (local dev bridge; documented as future work). No security policy is configured: anonymous, unencrypted sessions are accepted. A WARNING is logged at startup if the endpoint host is not loopback (127.0.0.1/localhost/::1). Safety input nodes are read-only unless `OPCUA_ALLOW_SAFETY_WRITES=1`.
- Alarms & Conditions, historical access.

## Constraints

- Command semantics preserved: one `command_code` per scan; multiple simultaneous client pulses are queued across scans in fixed priority order; consumed pulses are reset to False only after a successful `/plc/scan` POST (a failed POST leaves the pulse True so it is retried). asyncua has no compare-and-set, so a client re-writing True between the bridge's read and reset is coalesced with the consumed pulse.
- Inputs are forwarded only when a client changed the node since the last successful scan; the first scan forwards nothing, so simulator/scenario-owned inputs are never clobbered by node defaults. Pure `build_scan_request()` receives only the changed inputs and omits `inputs` when empty.
- All writes to the machine go through `/plc/scan` — no direct tag manipulation.
- Bridge degrades gracefully when API is unreachable (log + retry, CommsHealthy node reflects state). On failure, mirrored status nodes are set to Bad status (`BadCommunicationError`) until the next successful scan, and the retry interval backs off exponentially (capped at 2 s). A single `httpx.AsyncClient` is reused for the bridge lifetime and closed on shutdown.

## Verification

- New pytest for `build_scan_request` (pulse→code mapping, priority, consumption) and snapshot→node write mapping via async fakes.
- Full suite green; ruff clean.
- Manual smoke documented (uvicorn + bridge + optional client connect) — not automated in CI.
