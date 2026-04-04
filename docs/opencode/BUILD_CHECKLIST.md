# Build Checklist

Use this checklist to track progress.

## Foundations
- [ ] Shared enums stable
- [ ] Shared models stable
- [ ] Tag store stable
- [ ] Recipes load
- [ ] Faults load
- [ ] Scenarios load

## Simulator
- [ ] Start works
- [ ] Stop -> Run Empty works
- [ ] Reset works
- [ ] Grouping logic works
- [ ] Cycle phase logic works
- [ ] Good pack counting works
- [ ] Reject counting works
- [ ] STARVATION works
- [ ] DOWNSTREAM_BLOCK works
- [ ] BLANK_MISSING works
- [ ] GAP_CONTROL_JAM works
- [ ] Events emitted consistently

## API
- [ ] Health endpoint works
- [ ] State endpoint works
- [ ] Command endpoint works
- [ ] Recipe endpoint works
- [ ] Events endpoint works

## Dashboard
- [ ] Overview exists
- [ ] Start/Stop/Reset visible
- [ ] Fault banner visible
- [ ] Recipe visible
- [ ] Counters visible
- [ ] Machine feels industrial, not like a debug panel

## AI
- [ ] Fault explanation works
- [ ] Session summary works
- [ ] Uses structured context
- [ ] Does not control machine directly

## PLC-Style Control
- [ ] Permissives enforced
- [ ] Reset rules enforced
- [ ] Recipe gating enforced
- [ ] Mode logic visible
