# Project Progress Report

> Updated: 2026-07-27
> Supersedes the 2026-04-02 edition and `progress_improved.md`

---

## Summary

The Tray Packer Digital Twin is a functional platform with a strong simulator core, a
PLC-style controller, a FastAPI service and an 8-screen dashboard. The active workstream
is a **3D scene rebuild** — optimising the machine visualisation and raising it to match
the real Meurer CM/HTW documented in `docs/365257_18_OI.pdf`.

Backend test suite: **159 passing**.

---

## Implementation status by layer

| Layer | Status |
|---|---|
| Shared foundation (enums, models, tag store) | Complete |
| Config files (recipes, faults, scenarios) | Complete |
| Simulator engine | Core behaviour complete |
| PLC-style controller | Permissives + HMI flags working |
| API (FastAPI) | All endpoints present |
| Persistence | `app/shared/persistence.py` present; SQLite event store in `data/` |
| Dashboard — screens | All 8 built (Overview, Control, Faults, Production, Recipe, Diagnostics, Training, History) |
| Dashboard — 2D simulation | Rich SVG view, rAF-driven, snapshot-interpolated |
| Dashboard — 3D simulation | **Rebuild in progress — see below** |
| AI assistant | Partial |
| Reports | Basic session report |

> The April edition claimed "3 of 7 dashboard screens are empty stubs" and "zero
> persistence". Both are now out of date — every screen has real content (176–673 lines)
> and `persistence.py` exists.

---

## Active workstream: 3D scene rebuild

Full detail in `docs/3d-rebuild/` — `PLAN.md` (approach), `PERF.md` (measurements),
`MACHINE_REFERENCE.md` (OEM ground truth), `media/` (CAD figures).

### Why

Four problems, all confirmed with the user:

1. **Stutter** — no interpolation between 500 ms polls
2. **Slow** — 205 meshes, ~94 inline materials, 235 live geometries, shadows re-rendered every frame
3. **Wrong shape** — the model diverged substantially from the real machine
4. **Cheap look** — flat ambient lighting with no environment

### Phase status

| Phase | Scope | Status |
|---|---|---|
| 0 | Instrumentation harness | **Done** — `npm run capture3d` |
| 1 | Collapse 9 poll loops into one context; shadow/render cheap wins | **Done** |
| 2 | Asset registries, component decomposition, dead-code removal | **Done** (completed by Phase 4) |
| 3 | Motion smoothing | **Partial** — damped follow in place; full `SceneMotion` refactor outstanding |
| 4 | Static geometry merging | **Done** — draw calls 273 -> 160; ≤60 target still not met |
| 5 | Lighting and materials | **Done** |
| 6 | Geometry corrections + missing stations (6a–6h) | **Partial** — 6a proportions, 6b magazine, 6c inner guide shaft, 6e chain loop, 6g chains+folders+glue heads done; 6d, 6f, 6h remain |
| 7 | Overlay cleanup (`<Html>` 15 → ≤4) | Not started |

### Measured results so far

| Metric | Before | Now |
|---|---|---|
| `/state` polls on Overview | 4.0 req/s (2 loops) | 2.0 req/s (1 loop) |
| `SimulationView3D.tsx` | 1427 lines | 358 lines |
| Live geometries | 235 | 48 |
| Draw calls | 235 | 121 |
| Dead SVG components | 13 | 0 |

Draw calls fell 32% while also absorbing the ~38-call cost of image-based lighting, so
merging itself removed well over 100. The plan's ≤60 target is **not** met: the shadow
pass redraws every shadow-casting mesh, and several state-driven components are still
one mesh per element. See `docs/3d-rebuild/PERF.md`.

### Bugs fixed during the rebuild

- `isAutoTickEnabled` in `Layout.tsx` was a **dead toggle** — it mutated a hook instance
  no other screen observed
- `ProductSlug` rebuilt its entire InstancedMesh on every recipe change, and rewrote
  every instance matrix every frame
- `ManualZoneHighlight` leaked two geometries on every resize
- Fault and manual-mode lights **mounted and unmounted**, forcing a full material
  recompile on every fault trip and mode change
- Per-frame `lerp(a, b, 0.1)` was frame-rate dependent — the machine animated faster on
  a 144 Hz display than on a 60 Hz one
- `FlatBlank` recomputed its path sample 13× per render
- `SimulationView` / `SimulationView3D` had mismatched `sendCommand` signatures

---

## Repository hygiene (2026-07-27)

Removed 25 committed throwaway artifacts — test/lint output dumps, pytest logs, three
obsolete codemod scripts, `tmp_pdf_pages/`, `__pycache__`, `egg-info`. Moved `plan.md`
and `next-tasks.md` into `docs/`. Extended `.gitignore` to cover runtime data (`data/`),
tool output and regenerable captures so they cannot re-accumulate.

Root directory: 25 entries → 17.

---

## Known gaps

- **Nothing is committed.** The working tree carries the entire 3D rebuild plus
  pre-existing uncommitted work. A checkpoint is overdue.
- 3D geometry still diverges from the real machine in the ways catalogued in
  `MACHINE_REFERENCE.md` (5 glue guns not 2, dual transport chains, portal arch at the
  chain infeed, inner blank guide shaft, roller discharge track, tall slim cartons rather
  than cubes). Phase 6 addresses these; each affected part carries a `NOTE (Phase 6x)`
  comment pointing at its CAD figure.
- `fps` from the capture harness is meaningless — headless Chromium rasterises in
  software. Real frame timing needs GPU hardware.
