# 006 — Implementation Status (paused)

**Date:** 2026-11-27
**Plan:** [plan.md](plan.md)
**State:** Work was **stopped mid-implementation** at the user's request. Everything below is
**uncommitted** in the working tree on `main` (last pushed commit: `8e87f15`).

Three parallel subagents were working on disjoint files when stopped:

| Track | Owned files | Outcome |
|-------|-------------|---------|
| Backend (Phase A + B) | `app/simulator/**`, `app/shared/**`, `tests/**`, specs docs | **No changes written** — nothing to review or revert. |
| 3D scene (Phase C + scene part of D) | `app/dashboard/src/features/simulation/**` (except `materials.ts`), `src/hooks/simTypes.ts` | **Partial.** Scene model rewritten; several parts not yet wired. Build currently broken (see below). |
| Frontend infra (C.8, D.1, D.6, acceptance script) | `src/hooks/useSimulator.ts`, `scene3d/core/materials.ts`, `vite.config.ts`, `scripts/**`, `package.json`, `.gitignore` | **Mostly done**, unverified. Lint errors in `vite.config.ts`. |

## Verification snapshot (at stop)

| Check | Result |
|-------|--------|
| `pytest -q` | **214 passed** (backend untouched) |
| `npm run lint` | **10 errors** — `no-useless-escape` for `[\/]` in the regexes in `vite.config.ts` lines 17–20 (use `[/\\]` or `[\\/]`). |
| `npm run build` | **Fails**: `SimulationView3D.tsx(343,12) TS2741: Property 'phase' is missing` — `FormedCarton` now requires a `phase` prop that `SimulationView3D` doesn't pass yet. |
| `scripts/audit3d.mjs` | Written (389 lines), **never run**. |

## Backend tag contract (agreed, not yet implemented)

The frontend already reads these as optional fields with fallbacks (see `src/hooks/simTypes.ts`):

- `sts.blank_feed_subphase`: `"" | "magazine_check" | "suction" | "position" | "ready"`
- `sts.discharge_subphase`: `"" | "outlet_check" | "quality_decision" | "good_travel" | "reject_divert"`
- `sts.current_pack_is_reject`: bool, true from the quality decision until the pack leaves discharge
- `out.scrapped_product`, `out.scrapped_blanks`: int
- After a reset or a completed run-empty: `cycle_phase = "IDLE"`, progress `0`
- `cycle_phase_progress`: `0` when a phase starts, exactly `1.0` when it ends, never decreasing within a phase, **held** while BLOCKED/STARVED/FAULTED
- Non-stopping `REJECT_BIN_NEAR_FULL` goes to `warn.*`, not `fault.*`
- MANUAL jogs: the jogged phase's progress ramps 0→1, then holds
- `out.grouped_count` may become "products in the lanes for the *next* pack" if grouping is pipelined

## Plan item status

Legend: ✅ done (unverified) · 🟡 partial · ⬜ not started

### Phase A — dt-independent timing (backend): ⬜ all items
A.1 fixed-step loop · A.2 overshoot carry · A.3 progress contract · A.4 cycle-time budget / pipelining ·
A.5 real cycle time metric · A.6 scenario sim-time · A.7 seed — **none started.**

### Phase B — state machine & material (backend): ⬜ all items
B.1 reset/fault clears phase and sub-states · B.2 pause holds progress, RUN_EMPTY survives BLOCKED ·
B.3 last-blank / per-cycle escalation · B.4 independent sensor sources, BLOCKED in discharge ·
B.5 warning vs fault routing · B.6 scrapped accounting · B.7 sub-phase tags · B.8 manual jog ramps ·
B.9 `_finish_pack` refactor — **none started.**

### Phase C — 3D correctness (frontend)

| Item | Status | Notes |
|------|--------|-------|
| C.1 V1 instanced meshes vanish from cycle 2 | 🟡 | `ProductSlug.tsx`: fixed (group hidden, not unmounted; a ref callback resets the layout cache). `FormedCarton.tsx`: edited, but now needs a `phase` prop → build break. Other instanced parts not audited. |
| C.2 shared progress smoothing | 🟡 | New `hooks/useSmoothedPhase.ts` (filter `usePhaseTrack`/`stepPhaseTrack`: hold when paused, drop stale p>0.95 on phase entry, monotonic, records divert start; per-frame damper `useSmoothedValue`/`useSmoothedPhase`). The scene model uses the filter. Per-part consumers (SuctionArm, EdgeFlapFolders, RejectConveyor, ChainInfeed) are **not yet switched** to the damper. |
| C.3 single pack representation | 🟡 | Scene model: lane fill goes to 0 during CAPTURED→DISCHARGE when the group is full (`PACK_IN_FLIGHT_PHASES`). Slug/carton handover comments added. Not visually verified. |
| C.4 reject path | 🟡 | Scene model exposes `isRejectPack`, `rejectDiverting`, `rejectDivertProgress`, driven by `discharge_subphase`/`current_pack_is_reject`, with the old sensor-based logic as fallback. **`RejectConveyor.tsx` and `SimulationView3D.tsx` not yet updated** to use them. |
| C.5 RejectConveyor material via `args` | ⬜ | |
| C.6 fault visuals | 🟡 | Scene model: `CODE_STATIONS` map (code → station), red only for FAULTED, near-full read from `warn.*` with `fault.*` fallback, per-station severity map. `LabelLayer.tsx` has a 2-line change; `SimulationView3D` not wired. STARTING cue not done. |
| C.7 manual jog animation | ⬜ | Blocked on B.8. |
| C.8 tick/WS race | ✅ | `useSimulator.ts`: every snapshot goes through `applyState` with a monotonic sim clock (`runtime_sec + downtime_sec`). A drop to under 1 s is accepted as a counter clear or backend restart. Auto-tick has an in-flight guard, and the clock resets on WS reconnect. |

### Phase D — performance & hygiene (frontend)

| Item | Status | Notes |
|------|--------|-------|
| D.1 StrictMode materials | ✅ | `materials.ts`: release is deferred to a macrotask and cancelled if acquired again, so the cache survives mount→unmount→mount. |
| D.2 `frameloop="demand"` | 🟡 | New `animation/frameDemand.ts`: dampers request frames while they haven't settled. **The Canvas has not been switched** to demand mode yet (`SimulationView3D.tsx`). |
| D.3 per-frame allocations | 🟡 | Tuple spread removed in `ProductSlug`. GroupedLaneFill/`sampleBlankPath` not done. |
| D.4 label layout | ⬜ | |
| D.5 constants & comments | 🟡 | `SLOT_PITCH` and `MAX_PRODUCTS` moved to `machineLayout.ts` and used by `ProductSlug`, `groupingGeometry`, `FormedCarton`. Stale "500 ms / 2 Hz" comments fixed in `constants.ts`, `slugTracker.ts`, `FlatBlank.tsx`, `SidePushers.tsx`, `ChainInfeed.tsx`, `scene3d/README.md`. Duplicate types, the OrbitControls `any` and `replaceAll` not done. |
| D.6 vendor chunks | 🟡 | `vite.config.ts`: Rolldown `codeSplitting.groups` (vendor-react/three/r3f/drei); Vite 8's Rollup-compatible `manualChunks` is only advisory. **Lint errors** need fixing, and sizes before/after weren't recorded. Overlays lazy-load not done. |
| Acceptance script | 🟡 | `scripts/audit3d.mjs` and the `npm run audit3d` script, writing to `AUDIT_OUT` (default `audit3d-out/`, git-ignored). Not run. `review-checklist.md` and the `PERF.md` update weren't written. |

## Files changed (uncommitted)

```
M app/dashboard/.gitignore                         (audit3d-out/)
M app/dashboard/package.json                       (audit3d script)
M app/dashboard/vite.config.ts                     (vendor chunk groups — lint errors)
M app/dashboard/src/hooks/useSimulator.ts          (C.8)
M app/dashboard/src/hooks/simTypes.ts              (new optional tags)
M app/dashboard/src/features/simulation/scene3d/core/materials.ts   (D.1)
M app/dashboard/src/features/simulation/hooks/useMachineSceneModel.ts (C.2–C.4, C.6)
M app/dashboard/src/features/simulation/machineLayout.ts            (shared constants)
M app/dashboard/src/features/simulation/scene3d/parts/product/ProductSlug.tsx       (C.1)
M app/dashboard/src/features/simulation/scene3d/parts/transport/FormedCarton.tsx    (C.1, phase prop — breaks build)
M app/dashboard/src/features/simulation/scene3d/parts/product/groupingGeometry.ts   (constants)
M app/dashboard/src/features/simulation/scene3d/overlay/LabelLayer.tsx
M app/dashboard/src/features/simulation/animation/{constants,slugTracker}.ts        (comments)
M app/dashboard/src/features/simulation/scene3d/parts/{blank/FlatBlank,product/ChainInfeed,product/SidePushers}.tsx (comments)
M app/dashboard/src/features/simulation/scene3d/README.md
?? app/dashboard/scripts/audit3d.mjs
?? app/dashboard/src/features/simulation/animation/frameDemand.ts
?? app/dashboard/src/features/simulation/hooks/useSmoothedPhase.ts
```

## To resume

1. **Get the build green** (minutes):
   - Pass `phase={model.phase}`, or whatever `FormedCarton` expects, from `SimulationView3D.tsx:343`.
   - Fix the regex escapes in `vite.config.ts`.
   - Then run `npm run lint` and `npm run build`.
2. **Finish the 3D wiring:**
   - `SimulationView3D` consumes the new model fields (reject divert, station severities, near-full).
   - `RejectConveyor` uses them and sets its material imperatively (C.5).
   - Switch the Canvas to `frameloop="demand"` together with `frameDemand`.
   - Move the remaining progress consumers onto `useSmoothedPhase`.
3. **Backend Phases A then B**, against the contract above. Add `tests/test_sim_timing.py` and `tests/test_sim_state_regressions.py` per plan.md.
4. With both servers running, run `npm run audit3d`, review the screenshots against a new `review-checklist.md`, and record the perf and bundle numbers in `docs/3d-rebuild/PERF.md`.
5. **Commit per phase**, as plan.md §2 recommends.

## Related audit artefacts (not in repo)

- Earlier visual-capture screenshots (one cycle, fault, reset, jogs):
  `C:\Users\masal\AppData\Local\Temp\claude\343fa4e9d803c1d3\31046474-e3c2-4f72-a75f-9b53a48c82e1\scratchpad\shots\`
- Physics experiment scripts (`exp.py`–`exp6.py`): same scratchpad folder.
  The scratchpad is temporary and may be cleared.
