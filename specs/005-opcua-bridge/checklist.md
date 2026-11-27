# Checklist — OPC UA Bridge

## P0 (must pass)
- [ ] `build_scan_request` maps pulses to canonical command codes 1-10
- [ ] Multiple simultaneous pulses queue across scans (only fired one consumed/reset)
- [ ] RecipeSelect and Inputs pass through to the /plc/scan payload
- [ ] Namespace mirrors PlcSnapshot groups per PLC_Tag_List §19 folders
- [ ] All machine writes flow through POST /plc/scan only
- [ ] API-unreachable path degrades gracefully (log, CommsHealthy=False, retry)
- [ ] pytest green (existing 160 + new bridge tests); ruff clean

## P1 (should)
- [ ] Env-configurable endpoint/API URL/interval
- [ ] README documents how to run the bridge and connect a client
- [ ] No socket binding during unit tests

## P2 (nice)
- [ ] Datachange subscriptions instead of polling reads
- [ ] Certificate-based security
- [ ] Live automated end-to-end test with real OPC UA client (manual smoke for now)
