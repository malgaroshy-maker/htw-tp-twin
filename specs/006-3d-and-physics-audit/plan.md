# 006 — 3D View & Machine Physics Audit: Fix Plan

**Date:** 2026-11-27
**Scope:** `app/simulator/engine.py` (behaviour model) and `app/dashboard/src/features/simulation/**` (3D view + scene model).
**Method:** Three parallel audits — static review of the 3D code, measured experiments on the simulator
(fixed-seed runs at several `dt`), and a headless Playwright capture of the live 3D page across one cycle,
a fault, reset and manual jogs. Key findings were re-checked against the source.

Guiding rule (AGENTS.md): behavioural realism, not servo/mechanical simulation. The backend is the single
source of truth; the 3D view only renders tags. Several 3D defects are really backend defects and are fixed
there first.

---

## 1. Findings summary

### 1.1 Simulator ("physics") — measured

dt experiment (24-pack, 60 s sim time, reject/jam forced to 0):

| dt | cycles | total_in | total_used | blanks left |
|----|--------|----------|------------|-------------|
| 0.01 | 11 | 270 | 264 | 89 |
| 0.1 | 9 | 240 | 216 | 90 |
| 0.5 | 6 | 166 | 144 | 94 |
| 1.0 | 3 | 96 | 72 | 96 |

Real throughput is 53–61 % of `60 / nominal_cycle_time_sec` even at dt=0.01 (24-pack: 11/min vs 18.8 nominal).

| ID | Sev | Finding | Where |
|----|-----|---------|-------|
| P1 | High | Every phase/sub-phase timer discards overshoot and each phase handover costs a tick → throughput depends on `dt` (11 → 3 packs/min). | engine.py phase handlers (~600–830) |
| P2 | High | Real cycle ≈ 5.3 s vs nominal 3.2 s: GROUPING (≈2.2 s) runs serially and is outside the nominal budget; no pipelining of the next group; CAPTURED 0.3 s outside splits; `PHASE_SPLITS` overhead unused. `last_cycle_time_sec` is always written as nominal, so `avg_cycle_time_sec` reports a false 3.2 s. | engine.py ~560–860 |
| P3 | High | The last blank faults the pack: "ready" sub-phase sets `blank_available=False`, `sns.tray_in_transport` requires it, TRANSFER stalls and BLANK_MISSING fires 3 ticks later. | engine.py ~692–697, ~236, ~285 |
| P4 | High | Blank escalation counts ticks, not cycles (`_blank_empty_cycles` per `update()`), so BLANK_MISSING fires after 0.03 s at dt=0.01; reset doesn't clear the counter → immediate re-fault. | engine.py ~283–299 |
| P5 | High | Stale sub-state after fault: `_discharge_subphase` / `_discharge_quality_decided` / blank-feed sub-phase not reset on fault or reset; next pack skips outlet check and reuses the old reject decision; restart recaptures and consumes a second blank. | engine.py discharge/blank-feed, `_trigger_fault`, reset cmd |
| P6 | High | `sns.chain_clear`, `transfer_gap_clear`, `outlet_sensor_ok` all mirror `inputs.downstream_available`; the chain-gap fault check always wins, so outfeed-blocked faults (TRANSPORT_CHAIN_GAP) instead of going BLOCKED; BLOCKED branch in DISCHARGE is dead code. | engine.py ~223, ~243, ~764–775 |
| P7 | High | Reset/stop leave `cycle_phase` at the old phase (e.g. PACKING) while state is STOPPED → 3D stays frozen mid-pack after reset (seen in capture). | engine.py reset (~385–397), RUN_EMPTY completion |
| P8 | Med | Non-RUNNING states zero `cycle_phase_progress` but keep `cycle_phase` → animation rewinds on BLOCKED/STARVED/FAULT, jumps on resume. | engine.py ~577 |
| P9 | Med | Progress is stale for one tick at each phase boundary (new phase shows old phase's 1.0), never reaches 1.0 at phase end; BLANK_FEED progress is non-monotonic (0.08 → 0.05, 0.85 → 1.0). | engine.py phase handlers |
| P10 | Med | RUN_EMPTY overwritten by BLOCKED; on recovery machine returns to RUNNING with `run_empty_active=True` and never stops. | engine.py ~591, ~736, ~772 |
| P11 | Med | Non-stopping REJECT_BIN_NEAR_FULL sets `sts.fault_active=True`, which suppresses all blank warnings/escalation; it is also written to `fault.*` not `warn.*`. | engine.py ~272–275, `_trigger_fault` |
| P12 | Med | Material leaks: RUN_EMPTY clears a partial group uncounted; `jog_infeed` adds product without `total_product_in`; `clear_counts` leaves `grouped_count`/averages. | engine.py ~466, ~548, clear_counts |
| P13 | Med | Sub-phases (blank feed suction/position, discharge outlet/quality/travel/divert, reject decision) are private attributes, not tags — renderer has to guess. | engine.py, tag_store.py |
| P14 | Med | `tray_plate_sensor_ok` not reset after an INCOMPLETE_PACK reject → next good pack shows as reject for its first 20 % of DISCHARGE. | engine.py ~247 |
| P15 | Med | Manual jogs set a phase with progress 0 and nothing ever advances it (cycle phases skipped in MANUAL); `jog_pack_advance` cycles through IDLE without sub-state reset. | engine.py ~466–494, update() |
| P16 | Med | Scenario timing uses `time.time()`, not sim time. | scenario_runner.py |
| P17 | Low | Duplicated good/reject discharge blocks; `DISCHARGE_OUTLET_CHECK` logged every tick; unseeded RNG for API runs; one-tick STARVED at IDLE with a full group. | engine.py |

Verified OK: reject/jam rolled once per pack (dt-independent); `total_in == used + grouped` holds without faults; starvation mid-GROUPING pauses and resumes without loss; phase order matches the manual sequence.

### 1.2 3D view

| ID | Sev | Finding | Where |
|----|-----|---------|-------|
| V1 | High | Slug & in-carton products invisible from cycle 2: components unmount the InstancedMesh when hidden, the remounted mesh has zeroed matrices, but the `lastLayout` cache key is unchanged so matrices are never rewritten. | `parts/product/ProductSlug.tsx` ~42–62, 87; `parts/transport/FormedCarton.tsx` ~47, 121, 150 |
| V2 | High | Motion rewinds on STOP/FAULT/BLOCKED/STARVED (consequence of P8) — carton snaps to pack start, arm returns, pushers open. | `hooks/useMachineSceneModel.ts` ~77–165 |
| V3 | High | Reject drawn twice (FormedCarton stays on main line while RejectConveyor draws a live reject from p≥0.2); `liveRejectX` spans whole DISCHARGE though divert is 0.5–1.0; ghost reject on next good pack (P14). | `FormedCarton.tsx` ~82–89, `RejectConveyor.tsx` ~397–408, `SimulationView3D.tsx` ~356 |
| V4 | High | Products triple-drawn: lane fill keeps the full formation through CAPTURED→DISCHARGE while slug and carton also draw it. | `useMachineSceneModel.ts` ~83, `GroupedLaneFill.tsx` |
| V5 | High | Scene stays in PACKING pose after reset (P7). | backend + scene model |
| V6 | Med | Manual jogs produce no visible motion (P15). | backend + scene model |
| V7 | Med | Only X-translations are damped; suction arm, carton forming, edge flaps, reject travel, chain infeed use raw 5 Hz progress and step visibly. | `SuctionArm.tsx`, `FormedCarton.tsx` ~90–109, `EdgeFlapFolders.tsx`, `ChainInfeed.tsx` ~242 |
| V8 | Med | Phase-boundary flash when a new phase arrives with stale p≈1 (P9). | scene model |
| V9 | Med | StrictMode dev: scene-asset refcount disposes and rebuilds the material cache on mount/unmount/mount; children keep old materials, so all per-frame material animation (slug fade, glue glow, pusher glow) silently stops in dev. | `SimulationView3D.tsx` ~391–394, `core/materials.ts` ~186–199 |
| V10 | Med | RejectConveyor swaps material via `args`, recreating the InstancedMesh → stored rejects vanish on warning ack. | `RejectConveyor.tsx` ~392 |
| V11 | Med | REJECT_BIN_NEAR_FULL highlight checks `warn.active_code` but code arrives in `fault.active_code`; lighting turns red for non-stopping warnings. | `SimulationView3D.tsx` ~353 |
| V12 | Med | `/tick` responses and WS frames race (no in-flight guard, no monotonic check) → state can step backwards. | `hooks/useSimulator.ts` auto-tick |
| V13 | Med | Fault not shown in 3D: station labels stay green, no fault marker on the affected station; STARTING not visualised. | `overlay/LabelLayer.tsx`, `Overlays.tsx` |
| V14 | Low | Canvas renders continuously (no `frameloop="demand"`) with PCF soft shadows at dpr 1.5, even when STOPPED. | `SimulationView3D.tsx` ~452 |
| V15 | Low | Per-frame allocations (Set + string keys in GroupedLaneFill, `sampleBlankPath` objects, tuple spreads). | `GroupedLaneFill.tsx` ~157–186, `mathUtils.ts` |
| V16 | Low | Label collisions / clipping under HUD ("BLANK MAGAZINE"), low-contrast inactive labels, fault card overlaps label. | `overlay/LabelLayer.tsx`, `ThreeDSimPage.tsx` |
| V17 | Low | Duplicated constants (`SLOT_PITCH`, `MAX_PRODUCTS`, `CameraPresetKey`), magic numbers, stale "500 ms poll / 2 Hz" comments, one `any` for OrbitControls, `phase.replace('_',' ')` only first underscore. | various |
| V18 | Low | 3D chunk ~1 MB; no vendor split for three/drei; drei `Html` only used by manual overlays. | `vite.config.ts`, `Overlays.tsx` |

Verified OK: no phantom tag names; dispose paths for merged geometry are refcounted; chains/drivers stop in BLOCKED/STARVED/FAULTED; hidden-tab `damp` is safe.

---

## 2. Plan

Order matters: backend contract first (phases A–B), then the 3D view consumes it (C–D). Each phase is one PR-sized commit with tests.

### Phase A — Deterministic, dt-independent timing (backend) · P1, P2, P9, P16
1. Run `SimulatorEngine.update(dt)` as a fixed-step inner loop (`while remaining > 0: _step(min(remaining, SIM_STEP=0.02))`) so large `dt` behaves like many small ones; keep the public signature.
2. Make phase timers carry overshoot into the next phase (`timer -= dt; overflow = -timer`), and make phase transitions not consume a tick.
3. Progress contract: on every phase change write `cycle_phase_progress = 0.0` in the same step; write exactly `1.0` on completion; progress monotonic within a phase (fix BLANK_FEED sub-phase offsets so they partition [0,1]).
4. Cycle-time budget: decide and document in `docs/specs/Simulation_Specifications.md` whether `nominal_cycle_time_sec` covers CAPTURED→DISCHARGE only (recommended, matches the real machine where grouping overlaps the previous pack) and implement grouping overlap with the previous pack's PACKING/DISCHARGE via a separate buffer count. Ensure phase splits + capture sum exactly to nominal.
5. Measure real cycle time (CAPTURED start → discharge end) for `last_cycle_time_sec` / `avg_cycle_time_sec`.
6. Scenario runner uses accumulated sim time instead of `time.time()`.
7. Optional `seed` for the engine RNG (env `TRAYPACKER_SEED`).

**Acceptance:** new `tests/test_sim_timing.py` — same 60 s run at dt ∈ {0.01, 0.1, 0.5, 1.0} yields identical cycle counts (±0) and counters; throughput within 2 % of `60/nominal`; progress monotonic, starts at 0, ends at 1 for every phase.

### Phase B — State-machine & material correctness (backend) · P3–P8, P10–P15, P17
1. **Reset/stop**: reset and RUN_EMPTY completion set `cycle_phase = IDLE`, progress 0, clear all sub-states (`_reset_discharge_subphase`, blank-feed sub-phase), clear `_blank_empty_cycles` on successful reset. Fault entry also clears sub-states. Decide pack-in-progress policy on fault: scrap it and count it (`out.scrapped_product`, `out.scrapped_blanks`) — no silent double blank consumption.
2. **Pause semantics**: BLOCKED/STARVED/FAULTED hold `cycle_phase_progress` (no zeroing). Recovery from BLOCKED/STARVED returns to RUN_EMPTY if `run_empty_active`.
3. **Blanks**: don't drop `blank_available` in the "ready" sub-phase; escalate BLANK_MISSING on the next cycle's magazine check; `_blank_empty_cycles` increments once per attempted blank feed.
4. **Sensors**: give `chain_clear` / `transfer_gap_clear` independent sources (fault-driven, e.g. a `chain_gap` virtual condition set only by the TRANSPORT_CHAIN_GAP fault or scenario); `outlet_sensor_ok` follows `downstream_available` and makes DISCHARGE pause in BLOCKED instead of faulting. Reset `tray_plate_sensor_ok` / `open_flap_detected` outside DISCHARGE.
5. **Warnings vs faults**: non-stopping definitions (REJECT_BIN_NEAR_FULL) write `warn.*` and `sts.warning_active`, not `fault_active`; blank-warning suppression keys on `machine_state == FAULTED`.
6. **Material accounting**: RUN_EMPTY partial group → `scrapped_product`; `jog_infeed` increments `total_product_in`; `clear_counts` resets averages and keeps the invariant `in == used + grouped + scrapped`.
7. **Expose sub-phases as tags** (add to `tag_store.py` + `docs/specs/Tag_Interface_Spec.md`): `sts.blank_feed_subphase`, `sts.discharge_subphase`, `sts.current_pack_is_reject`.
8. **Manual jogs**: a jog starts a one-shot phase run — in MANUAL, `_process_cycle_phases` advances only the jogged phase to progress 1.0 then holds; `jog_pack_advance` skips IDLE and resets sub-states.
9. Refactor duplicated discharge blocks into `_finish_pack(is_reject)`; log `DISCHARGE_OUTLET_CHECK` once per pack.

**Acceptance:** `tests/test_sim_state_regressions.py` with one test per item (blocked-in-discharge → BLOCKED then RUNNING; last blank completes the pack; fault mid-discharge then reset → next pack does outlet check & fresh roll, one blank per pack; stop+block → ends STOPPED; NEAR_FULL keeps blank warnings; reset → phase IDLE; invariant holds through faults/run-empty/jogs). Update `Tag_Interface_Spec.md`, `State_Machine_Spec.md`.

### Phase C — 3D correctness (frontend) · V1–V6, V8, V10–V13
1. **V1**: keep InstancedMeshes mounted and toggle `mesh.visible` (or reset `lastLayout` in a ref callback) in `ProductSlug.tsx` and `FormedCarton.tsx`; audit other instanced parts for the same pattern.
2. **Shared progress hook**: `useSmoothedPhase(phase, progress, machineState)` in the scene model — holds last value while not RUNNING/RUN_EMPTY (belt-and-braces with B.2), ignores a stale p > 0.95 on the first frame of a new phase, damps toward the 5 Hz target, never runs backwards within a phase. All consumers (suction arm, carton forming, edge flaps, reject travel, chain infeed) read from it.
3. **Product visibility**: lane fill draws 0 from CAPTURED onward (or only products grouped since capture once Phase A pipelining lands); exactly one representation of the current pack at any time.
4. **Reject path**: drive from `sts.discharge_subphase` / `current_pack_is_reject` (Phase B.7) — FormedCarton hides once divert starts, RejectConveyor's live reject maps `(p − 0.5) / 0.5`; no reject visuals for good packs.
5. **RejectConveyor**: set material imperatively, never via `args`.
6. **Fault visuals**: read REJECT_BIN_NEAR_FULL from `warn.*` (after B.5); lighting red only for stopping faults; fault marker + red label on the affected station; labels not green while FAULTED; simple STARTING cue.
7. **Manual mode**: animate jogged phases from the backend progress produced by B.8.
8. **Data race**: drop stale state in `useSimulator` using a monotonic `plc.scan_counter`/`out.runtime_sec` guard; in-flight guard on auto-tick and don't `setState` from `/tick` responses.

**Acceptance:** Playwright script promoted from the audit into `app/dashboard/scripts/audit3d.mjs` capturing ≥ 2 full cycles, a reject, a fault+reset, BLOCKED mid-discharge and a manual jog; manual review checklist in this folder; `npm run lint` + `npm run build` clean.

### Phase D — 3D performance & hygiene · V9, V14–V18
1. Materials: lazy module-level cache without refcount disposal (or deferred disposal) so StrictMode doesn't orphan materials.
2. `frameloop="demand"` with `invalidate()` on state changes, OrbitControls change and while any damper is settling.
3. Remove per-frame allocations (numeric keys, scratch objects).
4. Label layout: avoid HUD clipping, raise inactive contrast, offset colliding labels.
5. Consolidate constants into `machineLayout.ts`, remove duplicated types, fix stale comments, type OrbitControls ref, `replaceAll('_',' ')`.
6. Vite `manualChunks` for three/drei; lazy-load manual `Overlays`.

**Acceptance:** `?perf=1` before/after table in `docs/3d-rebuild/PERF.md` (draw calls, frame time when STOPPED ≈ idle), no console errors in dev (StrictMode) run, bundle size recorded.

---

## 3. Sequencing & risk

| Phase | Depends on | Risk | Notes |
|-------|-----------|------|-------|
| A | — | Medium: timing change shifts every timed test; scenario tests may need new expectations | Land first; it changes tag dynamics the 3D view relies on |
| B | A (progress contract) | Medium: tag additions touch spec + PLC mapping | Keep PLC snapshot backward-compatible (new tags not in PLC map unless needed) |
| C | B.5, B.7, B.8 for items 4, 6, 7 | Low–Medium | C.1, C.2, C.5, C.8 can start in parallel with A/B |
| D | — | Low | Independent; can run anytime |

Parallelisable work: {A→B} backend track and {C.1, C.2, C.5, C.8, D} frontend track touch disjoint files.
