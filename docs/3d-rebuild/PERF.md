# 3D Rebuild — measurements

Harness: `app/dashboard/scripts/capture3d.mjs` (Playwright). Needs both dev servers up.

```bash
cd app/dashboard
npm run capture3d
```

It reports the backend poll rate per route and writes screenshots to
`docs/3d-rebuild/captures/`.

> **Note on the baseline.** The repo had substantial uncommitted work in the tree when
> this started, so `git stash` could not isolate a true pre-change snapshot — stashing
> reverted unrelated in-progress work as well. The "before" figures below were instead
> measured by a targeted, reverted experiment (pointing `Layout.tsx` back at its own
> store instance), which reproduces exactly the old one-loop-per-consumer behaviour.

## Phase 1 — poll loop consolidation

`useSimulator` was a plain hook called in 9 places (`Layout`, `Overview`, `Control`,
`Diagnostics`, `Faults`, `Production`, `Recipe`, `Training`, `ThreeDSimPage`). Each
instance owned its own `setInterval(500)` and its own state tree, so every mounted
consumer added a full `/state` + `/events` poll and an independent re-render source
for the 3D scene.

It is now a context: `useSimulatorStore()` runs once inside `SimulatorProvider`
(mounted in `App.tsx`), and `useSimulator()` reads it. No call site changed.

### Measured, 10 s samples

| Route | Before | After |
|---|---|---|
| `/` (Overview — mounts `Layout` + `Overview`) | **4.0 req/s** (2 poll loops) | **2.0 req/s** (1 loop) |
| `/3dsim` (mounts `ThreeDSimPage` only) | 2.0 req/s (1 loop) | 2.0 req/s (1 loop) |

`/events` tracks `/state` one-for-one, so the totals halve on Overview too.

`/3dsim` was already a single consumer, so its rate is unchanged — the win there is
that the scene no longer competes with a second state tree when navigated to from
elsewhere, and `isAutoTickEnabled` now actually works.

### Side effect fixed

`Layout.tsx:11` reads `isAutoTickEnabled` / `setIsAutoTickEnabled`. Because it held its
own hook instance, the Developer Tools auto-tick toggle mutated state **no other screen
observed** — it was a dead control. It is now genuinely global.

## Phase 1 — 3D scene cleanups

| Change | Was | Now |
|---|---|---|
| `useMachineSceneModel` calls per render | 2 (`:1008` scene, `:1338` HUD) | 1, hoisted and passed down |
| `ContactShadows` | `frames={Infinity}`, `resolution={1024}` | `frames={1}`, `resolution={512}` |
| Key light shadow map | 2048², default (over-large) frustum | 1024², frustum tightened to ±20 × ±10, `normalBias` |
| `setMounted` effect | forced a second render before Canvas mount | removed |
| `console.log` in render paths | 2 (`:1012`, `:1342`) | 0 |

`ContactShadows` at `frames={Infinity}` was re-rendering the whole scene into a depth
target every frame for a machine base that never moves.

### Verified

- `npx tsc --noEmit` clean
- `npx eslint` clean on all touched files
- `npx vite build` succeeds
- `/3dsim` renders correctly — see `captures/3dsim-overview.png`
- No page errors beyond transient `Failed to fetch` at navigation teardown

## Phase 2 — instrumentation + asset registries (in progress)

`SceneStats` (`scene3d/dev/SceneStats.tsx`, mounted behind `?perf=1`) publishes
`renderer.info` on `window.__sceneStats`; the harness reads it.

### Measured on `/3dsim?perf=1`

| Metric | Before Phase 2 | Now |
|---|---|---|
| draw calls | 235 | 235 |
| shader programs | 8 | 8 |
| live geometries | 235 | 210 |
| textures | 5 | 5 |
| triangles | 12 600 | 12 600 |

### Two corrections to the plan's assumptions

**1. Shader programs were never the problem.** The plan estimated ~90 programs from
the ~94 inline `<meshStandardMaterial>` declarations. The renderer actually compiles
**8**. Three.js caches programs by *configuration*, not by material instance, so 94
materials sharing the same feature set compile once. The material registry is still
worth doing — GPU memory, uniform uploads, and the ability to batch — but the "~90 → ≤20
programs" target in `PLAN.md` was wrong and is withdrawn.

**2. Sharing geometry does not reduce draw calls.** Draw calls sit at 235 and will not
move until static geometry is **merged** (Phase 4). Pointing many meshes at one shared
`BoxGeometry` cuts the live-geometry count (235 → 210 so far) and memory, but each mesh
is still its own draw call. The ≤60 draw-call target depends entirely on Phase 4, not
on this phase.

**3. `fps` from this harness is not a perf signal.** Headless Chromium rasterises in
software (reported 5–6 fps regardless of changes). Frame timing has to be measured on
real GPU hardware; the harness reports fps for completeness only.

### Done

- `scene3d/core/` — `palette.ts`, `materials.ts` (shared registry + refcounted disposal),
  `geometries.ts` (unit primitives), `primitives.tsx` (`Box`/`Cyl`/`Plane`), `mathUtils.ts`
- **15 components extracted** into `scene3d/parts/{static,blank,product,transport,sensors,overlay}/`,
  each `React.memo`'d and converted to the registry
- `acquireSceneAssets` / `releaseSceneAssets` wired into the mount point
- Deleted 13 dead SVG components in `features/simulation/components/` (all except
  `Pack.tsx`, which `SimulationView2D` uses; `components/topdown/*` all remain live)
- **`SimulationView3D.tsx` 1427 → 583 lines**; live geometries **235 → 87**

### Bugs fixed while extracting

| Bug | Was | Now |
|---|---|---|
| `ProductSlug` instance buffer | `args={[…, rowCount*colCount]}` — three.js rebuilt the whole InstancedMesh on every recipe change | fixed `MAX_INSTANCES`, `mesh.count` mutated |
| `ProductSlug` matrices | every instance matrix rewritten every frame unconditionally | rewritten only when row/col/compression/scale actually change |
| `ManualZoneHighlight` geometry leak | `new THREE.BoxGeometry` in a `useMemo`, never disposed, feeding an `edgesGeometry` | cached by size, source box disposed; at most 3 ever created |
| `FlatBlank` | `sampleBlankPath` recomputed 13× per render, twice per edge strip | memoised, centre pose sampled once |
| `SimulationView.tsx` | `sendCommand?: (action) => Promise<any>` mismatched the 3D view | `Promise<unknown>` |

### Verified

`tsc --noEmit` clean · `eslint src` clean (zero errors across the whole tree) ·
`vite build` succeeds · 159/159 Python tests pass · captures unchanged at IDLE **and**
in `RUNNING / GROUPING`, which is the only state that exercises `ProductSlug`,
`FormedCarton` and `FlatBlank` — they are all `visible={false}` at IDLE, so an idle-only
capture proves nothing about them.

### Remaining in Phase 2

The static frame/deck/guard block is still inline in `MachineScene` (~36 inline
materials). It is the natural unit of work for Phase 4 merging, so it stays inline
until then. `PALETTE` and the old `SHARED_MATERIALS` const remain in
`SimulationView3D.tsx` solely to serve that block, and go away with it.

## Phase 5 — lighting and materials (done)

`scene3d/core/Lighting.tsx`.

The scene ran `ambientLight intensity={1.2}` to compensate for a removed
`<Environment preset="studio" />` (drei's presets fetch HDRs from
raw.githubusercontent.com, which was 503ing). **That is why it looked cheap:** ambient
light contributes no specular and no reflection, so `metalness` had nothing to reflect
and stainless rendered as flat grey paint.

| Change | Was | Now |
|---|---|---|
| Environment | none (removed, CDN) | `<Environment frames={1}>` built from 5 `<Lightformer>` emitters — **no network dependency**, baked once |
| Ambient | `1.2` (killing all form) | `0.15`, only lifting blacks |
| Lights | 2 directional + 2 point + up to 2 conditional | 1 key directional + 1 always-mounted accent |
| Fault / manual lights | **mounted and unmounted** | one accent light whose colour/intensity varies |
| Tone mapping | none | `ACESFilmic`, exposure 1.05 |
| Shadows | `PCFShadowMap` | `PCFSoftShadowMap` |
| Fog | `[22, 44]` — cut a 35-unit machine in half | `[34, 78]` |

The mount/unmount fix matters beyond tidiness: adding or removing a light changes the
shader permutation, forcing three.js to **recompile every material in the scene**. That
was a guaranteed hitch on every fault trip and every mode change.

### Cost, stated plainly

| Metric | Phase 2 end | Phase 5 end |
|---|---|---|
| draw calls | 235 | **273** |
| shader programs | 8 | **16** |
| geometries | 87 | 102 |
| textures | 5 | 8 |

Image-based lighting is not free — the PMREM and the emitter meshes cost roughly 38
draw calls and 8 programs. This is a deliberate trade: the scene was unreadable before
and is legible now (compare `captures/`). Phase 4 merging is expected to take draw calls
well below the pre-lighting figure, and that is where the ≤60 target is won.

## Phase 3 — motion smoothing (partial)

`animation/constants.ts` now owns `SNAPSHOT_BLEND_MS` and `VISUAL_SPEED_SCALE`, and the
2D hook imports them, so the two views can no longer drift apart.

**Deviation from the plan, deliberately.** The plan called for porting the 2D snapshot
blend into 3D wholesale. That requires the full `SceneMotion` refactor (extracting every
numeric field out of `useMachineSceneModel` into a per-frame pure function), which is a
large change. What is implemented instead is a **frame-rate-independent damped follow**
(`damp()` in `animation/constants.ts`): parts chase their target position each frame
rather than snapping to it at the poll boundary. Different mechanism, same visible
outcome — the stutter is gone — at a fraction of the risk.

Applied to `FlatBlank` (re-samples the curved ramp path per frame, so it bends correctly
while gliding), `ProductSlug`, `FormedCarton`, `DividerModule` and the transfer pusher.

This also fixed a latent bug: the existing `THREE.MathUtils.lerp(current, target, 0.1)`
calls converge at a rate that **depends on frame rate**, so the machine animated
noticeably faster on a 144 Hz display than on a 60 Hz one. `damp()` uses exponential
decay against real delta time and does not.

**Still outstanding:** `GroupedLaneFill` and `SidePushers` still take positions straight
from props, and the true shared-clock parity test (`packX` traced from 2D and 3D,
divergence < 0.02) needs the full `SceneMotion` refactor to be meaningful.

## Still outstanding (later phases)

The scene is still visibly flat and dark in `captures/3dsim-overview.png` — that is the
Phase 5 lighting/material work, not yet started. Draw calls, shader program count and
frame timings are not yet instrumented; `r3f-perf` and a `gl.info` probe land with
Phase 2.
