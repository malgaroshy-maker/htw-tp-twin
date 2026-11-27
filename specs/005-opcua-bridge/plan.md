# Plan — OPC UA Bridge

## Module layout

```
app/integration/__init__.py
app/integration/opcua_server.py
```

## Command translation (pure, unit-tested)

```python
COMMAND_PRIORITY = [
    ("start", 1), ("stop", 2), ("reset", 3), ("run_empty", 4),
    ("mode_auto", 5), ("mode_manual", 6), ("ack_alarm", 7),
    ("clear_counts", 8), ("refill_blanks", 9), ("clear_rejects", 10),
]

def build_scan_request(pulses: dict[str, bool], recipe_select: str | None,
                       inputs: dict[str, bool]) -> tuple[dict, list[str]]:
    """Returns (plc_scan_request_payload, consumed_pulse_names)."""
```

- Highest-priority set pulse becomes `command_code`; it and any lower ones? No — only the fired command is consumed this scan; remaining pulses stay latched for subsequent scans (queue behavior).
- `recipe_select` passed through when non-empty (controller validates against recipe-change-permitted).
- `inputs` mirrored verbatim into `inputs` field.
- No pulses → `command_code: 0`, consumed = [].

## Namespace (namespace URI `urn:traypacker:opcua`)

```
Objects/TrayPacker/
  Commands/   Start Stop Reset RunEmpty ModeAuto ModeManual AckAlarm
              ClearCounts RefillBlanks ClearRejects   (writable Bool pulses)
              RecipeSelect (writable String)
  Inputs/     ProductAvailable BlankAvailable DownstreamAvailable
              SafetyOK EStopOK GuardsClosed UtilitiesOK   (writable Bool)
  Status/     MachineState Int, MachineMode Int, CyclePhase Int,
              CyclePhaseProgress Float, ReadyToStart CycleActive RunEmptyActive
              FaultActive WarningActive StartPermissiveOk (Bool)
  Outputs/    GroupedCount TargetGroupCount CycleCount GoodPackCount
              RejectPackCount RejectAccumulationCount BlanksRemaining
              TotalProductIn TotalProductUsed RuntimeSec DowntimeSec
              LastCycleTimeSec AvgCycleTimeSec
              LastPackResult Int, LastRejectReason Int
  Faults/     ActiveCode Int, ActiveSeverity Int, Latched Bool,
              ActiveCount Int, LastAcknowledged Int
  Warnings/   ActiveCode Int, ActiveCount Int
  Sensors/    all 15 PlcSns booleans
  Diagnostics/ ScanCounter HeartbeatCounter CommsHealthy CommandAckCode
              LastCommandCode CurrentMode ModeAck ScanDurationMs
```

All values come from the `asdict(PlcSnapshot)` response of `/plc/scan`. Field paths defined once in a declarative map: `{node_name: (group, field)}`.

## Scan loop

```python
async with server:
    while True:
        t0 = monotonic()
        pulses = {name: await node.read_value() ...}      # 10 bool reads
        recipe = await recipe_node.read_value()
        inputs = {name: await node.read_value() ...}      # 7 bool reads
        request, consumed = build_scan_request(...)
        try:
            snap = await self._post_scan(request)          # httpx AsyncClient
            await self._write_snapshot(snap)               # declarative writes
            comms_ok = True
        except Exception:
            comms_ok = False; log.warning(...)
        finally:
            for name in consumed: await pulse_node(name).write_value(False)
        await Diagnostics/CommsHealthy.write_value(comms_ok)
        await sleep(max(0, interval - (monotonic()-t0)))
```

## Config

Env vars read in `main()`: `TRAYPACKER_API_URL` (default `http://localhost:8000`),
`OPCUA_ENDPOINT` (default `opc.tcp://localhost:4840/traypacker/`),
`OPCUA_SCAN_INTERVAL_SEC` (default `0.1`).

## Tests (`tests/test_opcua_bridge.py`)

1. Pulse → correct `command_code`, consumed list contains it.
2. Priority: start+reset together → start fires, reset stays latched.
3. Empty pulses → code 0, nothing consumed.
4. Recipe select + inputs passthrough.
5. `_write_snapshot` mapping via fake async node recorder: spot-check MachineState int, GoodPackCount, CommsHealthy path.

## Risks

- Port 4840 conflicts on user machines → configurable via env; not bound during tests.
- asyncua write type strictness → initialize nodes with correctly typed defaults matching PlcSnapshot fields.
