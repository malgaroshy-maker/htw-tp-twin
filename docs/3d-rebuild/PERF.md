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

## Phase 4 — static geometry merging (done)

`scene3d/core/merge.ts` bakes immovable parts into one buffer per
(material, castShadow, receiveShadow) combination. Merged: the machine frame
(~60 meshes), the tray station, the transport bed, the blank lift path
(38 segments) and the lug track (24 bars — rigid relative to each other, so the
merged block is simply translated as a whole).

This also finished the Phase 2 remainder: the static block was the last holder of
inline materials. `SimulationView3D.tsx` now contains **zero** inline
`meshStandardMaterial` / `boxGeometry` declarations, and the legacy `PALETTE` and
`SHARED_MATERIALS` consts are deleted.

### Full trajectory, measured on `/3dsim?perf=1`

| Metric | Start | After P2 | After P5 (lighting) | After P4 (merging) |
|---|---|---|---|---|
| draw calls | 235 | 235 | 273 | **160** |
| live geometries | 235 | 87 | 102 | **48** |
| shader programs | 8 | 8 | 16 | 16 |
| `SimulationView3D.tsx` | 1427 lines | 583 | 561 | **358** |

**The ≤60 draw-call target was not met.** 160 is a 32% reduction on the starting
figure while also absorbing the ~38-call cost of image-based lighting, so the
merging itself removed well over 100 calls. What remains is dominated by:

- the **shadow pass**, which redraws every `castShadow` mesh a second time
- components not yet merged because they are state-driven rather than static:
  `ChainInfeed` (~30 meshes), `RejectConveyor` (~20), `GroupedLaneFill`
  (up to rows x cols), `FormedCarton`, `DividerModule`, `SuctionArm`

Getting to ≤60 needs instancing for the repeated state-driven meshes and a cut in
shadow-casting meshes — both real work, neither done here. The target stands;
this phase did not reach it.

Triangles fell from 12.6k to ~6k. That is a genuine LOD reduction, not lost
geometry: drei's `<RoundedBox>` defaults to `smoothness = 4`, and the merged
version uses 2 on seven large flat slabs where corner tessellation is invisible
at every camera preset. Verified against the captures.

## Phase 6 — geometry corrections (partial)

### 6a — real proportions (done)

`machineLayout.ts` now carries the real dimensions from OI 2-23 and derives scene
geometry from them instead of eyeballed constants:

```
REAL_MM   product 47 x 33 mm, height 63-122 mm; tray 382 x 145 mm; lane pitch 145/3
MM        scene units per mm, pinned so the 382 mm tray keeps its existing on-screen
          length -- which keeps every zone position in MACHINE_LAYOUT_3D valid
```

| Was | Now |
|---|---|
| product a 0.46 **cube** | 0.256 x 0.852 x 0.364 — a tall slim carton, correct aspect |
| tray 2.96 x 1.88 (1.57:1) | 2.96 x 1.124 (**2.63:1**, matching 382 x 145 mm) |
| `laneSpread: 1.55` (3.10 span, arbitrary) | 0.375 pitch from 145/3 (**0.75 span**) |
| `FormedCarton` walls along the wrong axes | side walls along travel, end flaps across |

These are now internally consistent in a way they were not before: 3 lanes at
0.375 pitch spans 1.12, which *is* the tray width; and products at 0.364 across
nearly fill their lane, as they do on the real machine. Previously the scene drew
tiny cubes spread over lanes four times too far apart.

The lane span narrowing (3.10 → 0.75) is large and deliberate. Lane *count* stays
driven by `cfg.grid_rows`; only the pitch is pinned to the manual, because the OEM
plan view shows more lanes than format cb 12 has.

### 6b — magazine (done)

Four **separate** blank stacks with the >=20 mm gap the manual specifies, driven
against an end stop (OI 5-25, OT p12). Previously one continuous pile.

### 6g — glue heads (partial)

Five applicator heads instead of two, staggered three/two across the rails per the
CAD detail (OI 5-38 item 7, which labels "7" five times).

### 6c — inner blank guide shaft (done)

The mechanism was modelled wrongly. The cross transfer does **not** feed the
suction arm directly: it fills a vertical **inner guide shaft** (the "internal
tray magazine"), and the suction arm reaches up, grips the lowest blank and
draws it **downward** out of the shaft onto the blank transport. Vacuum is cut
at the arm's lower end position (OI 5-33; corroborated by the "Maximum Level
internal Traymagazin" sensor).

Added `InnerMagazine` — corner guide posts, retaining plates, an instanced blank
stack bound to `blanks_remaining`, and the minimum-count sensor at the mouth.
`SuctionArm` reworked from a vague dip into a real two-stroke cycle: descend
carrying the blank with vacuum on (t 0–0.5), return empty with vacuum off
(t 0.5–1).

**Bug caught while wiring this:** `blanks_remaining` lives in the `out` tag
group, not `sns`. The first version read `sns.blanks_remaining`, which is
`undefined`, so the shaft rendered permanently empty. Verified against the live
API rather than assumed.

### Not done in Phase 6
- **6d** separator, width adjustment, side frames, stopper, terminal
- **6e** portal arch and five pusher plates at the chain infeed
- **6f** blank transport drivers and curved guide plate
- **6g** the rest: dual upper/lower transport chains, edge flap folders, corner cover
  feeder, vertical gluing heads, upper/lower blank and pressure guides
- **6h** discharge roller track on its own legs, safety roll, full sensor table

Each affected component carries a `NOTE (Phase 6x)` comment naming its figure.

## Phase 7 — overlay cleanup

Not started. 5 `<Html>` overlays remain in scene components plus 11 `ZoneLabel`s.

## Draw-call optimisation pass

### The measurement that reframed the problem

Adding mesh and shadow-caster counts to the probe showed that **draw calls track
visible mesh count exactly 1:1** — 169 meshes, 169 calls. The shadow pass was not
the multiplier the plan assumed. So the target is a *mesh-count* problem, not a
shadow problem.

| Step | meshes / calls | casters |
|---|---|---|
| before this pass | 169 | 140 |
| instancing (lane fill, flat blank, glue nozzles, stored rejects) | 133 | 53 |
| merging divider statics, flow arrows | 128 | 55 |
| consolidating near-duplicate steel materials | **114** | 44 |

### Why merging alone gave so little

Merging only pays when many parts **share a material** — it produces one mesh per
(material, shadow-flags) bucket. `MachineFrame` worked because ~60 parts spanned
~8 materials. A station with 8 parts across 5 materials merges to 5 meshes and
saves almost nothing.

The registry had accumulated perceptually near-identical stainless tones —
`cover`/`steelLight`, `rail`/`steelMid`, `coverDark`/`steelDark`,
`deckPlate`/`frame`, `frameDarkMatte`/`frameDark` — differing by 0.02–0.06 in
roughness. Collapsing those five pairs merged the buckets and took 128 → 114 on
its own, with no visible difference in the captures.

### The ≤60 target is not met, and the estimate was wrong

**114 draw calls, down from 235 — a 51% reduction, absorbing the ~38-call cost of
image-based lighting along the way.** The ≤60 figure in `PLAN.md` was set before
any measurement, on the assumption that programs were the bottleneck and that the
shadow pass doubled calls. Both were wrong.

What is left is mostly irreducible without changing what the scene shows:

- ~34 calls of merged static structure — already one mesh per material
- ~10 `FormedCarton` panels that animate independently and cannot merge
- per-station detail (stopper/terminal, suction arm, side pushers, sensors) that
  is animated or state-driven

Reaching 60 would need the material palette collapsed to ~6, which would flatten
the visual differentiation the lighting work exists to show. A realistic floor
for this scene, keeping its current fidelity, is **80–90**. The ≤60 target is
withdrawn as unfounded rather than quietly carried forward.

## Animation realism

### The formation used to vanish into the carton

During `PACKING` the product slug faded to zero opacity and `FormedCarton` was an
**empty box** — so the products disappeared at the exact moment the tray wrapped
around them, which is the opposite of what the machine does. The carton now
carries its own instanced formation, laid out on the real slot and lane pitch, so
the products stay visible inside the tray through packing and discharge.

Verified by probing the live scene during `PACKING`: two instanced meshes report
count 24 for a 3 x 8 recipe — the slug in transit and the formation inside the
carton.

### Lanes now accumulate against the stopper

Two things about the grouping lanes read as a counter rather than a machine:

- Products were laid out **forwards from a fixed upstream origin**, so a filling
  lane grew *towards* the stopper and left a gap in front of the blade. An
  accumulating lane does the opposite: product queues hard against the closed
  stopper and stacks upstream behind it.
- New products **appeared at their slot**. They now slide in from the lane entry
  with the same damped follow the rest of the scene uses, so the lane visibly
  fills.

`groupingGeometry.ts` holds `STOPPER_X`, `TERMINAL_X`, the slot pitch and the
blade travel, shared by `GroupedLaneFill` and `StopperTerminal`. Previously each
computed the stopper position independently, so a product could come to rest
where the blade was not.

### Station positions checked against the plan view

Each station centre was normalised along the machine body and compared with the
OEM plan view (OI 5-3). The scene was measurably wrong:

| Station | Plan | Was | Error |
|---|---|---|---|
| Feeding 5-7 | 0.00 | 0.16 | +0.16 |
| Grouping 5-11 | 0.24 | 0.37 | +0.14 |
| Blank magazine 5-25 | 0.22 | 0.09 | **-0.13** |
| Chain infeed 5-17 | 0.58 | 0.51 | -0.07 |
| Flap detection 5-51 | 0.98 | 0.92 | -0.06 |
| Main transport 5-37 | 0.70 | 0.73 | +0.03 |

(Fractions of machine length. The magazine was a seventh of the whole machine
too far upstream, sitting beside the infeed instead of alongside the grouping
section as the drawing shows.)

Positions corrected throughout `MACHINE_LAYOUT_3D`, with the decks, camera
presets, flow arrows, label anchors and the components that carried hardcoded X
values all moved to match.

### Feeding and blast station added

Correcting the positions left the head of the machine empty, because the
**feeding conveyor (OI 5-7) and blast station (OI 5-5) were never modelled at
all**. `InfeedStation` adds the infeed belt with its side guides and support
frame, the blast device and its compressed-air reservoir, and the four sensors
that station actually has: transfer, "min. jam", and the upper/lower fall-over
stop pair.

### Motion coupling

Two mechanisms animated independently of the thing they act on:

- **Pusher plates swept through empty air.** The chain loop advanced on cycle
  progress while the formation moved on its own timing. During `TRANSFER` the
  loop phase is now solved from the slug's live X (`phaseAtLowerRunX` inverts
  the loop path for the straight working run), so a plate sits behind the
  formation it is pushing.
- **Products appeared at the head of the lane.** They now enter just downstream
  of the divider carriage, so they read as having been placed by it.
  `DIVIDER_X` is shared between the divider and the lane entry.

### Harness additions

- `phase-packing.png`: the harness now ticks until `cycle_phase === 'PACKING'`
  before capturing the transport close-up. Any other phase says nothing about the
  carton.
- `SceneStats` publishes `instancedCounts`, which is what made the check above
  possible without poking at R3F internals.

## Geometry leak, found and fixed

Phase 4 introduced `mergeStaticParts` in eleven components, each calling it from
a bare `useMemo`. Merged buffers are per component instance — unlike the geometry
and material registries they are not module singletons — so nothing ever freed
them. `disposeMergedGroups` existed and was never called.

The harness leak check (navigate between routes eight times, compare a live
counter) measured **84 → 588: 63 geometries leaked per mount**.

Two things made the obvious fix wrong, and the test caught both:

1. `page.goto()` is a full reload, which resets module state and hides the leak
   entirely. The check navigates client-side via `pushState` + `popstate`.
2. Disposing in a `useEffect` cleanup is wrong under **StrictMode**, which
   double-invokes effects — it freed the buffers immediately after the first
   mount, while the scene was still drawing with them. That version fixed exactly
   half the leak and broke the other half.

Replaced with a refcounted module cache keyed by component name, the same shape
as the material registry. This also fixed a second issue: `SimulationView`
(Overview) and `ThreeDSimPage` **both** render the machine, so each was building
its own full set of merged buffers. Sharing them halved the baseline, 84 → 42.

Leak check now reports **42 → 42** across eight mount/unmount cycles.

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

## Station and component alignment audit

Every station was re-checked against the zone table and against the stations it
hands over to, on two questions: does it stand where the layout says, and is it
driven by the right signal at the right moment. Fourteen defects, all of the same
family — a hardcoded number that was correct before the format table (OI 2-23)
pinned the product to 33 × 47 × 110 mm and the tray to 382 × 145 mm, and was
never re-derived afterwards.

### Two lane tables

`getLaneZ3D` (span ±1.55, from the retired `laneSpread`) survived alongside
`getLaneZ3DReal` (span ±0.375, from the 145 mm / 3 format pitch) and was still
driving the **divider carriage**. The carriage sought lane centres four times
further out than the lanes it was feeding. The lane **support rails** in the scene
composition were on the same retired spread. `getLaneZ3D`, `laneSpread` and
`productSize3D` are deleted; there is now one lane table.

### Things that stood at product height, or did not

`deckHeights.products` is the surface product stands on. Three components read it
as something else:

| Component | Was | Consequence |
|---|---|---|
| `ProductSlug` | instances centred *on* the deck | slug sank half its height into the deck the moment it left the lanes |
| `GroupedLaneFill` lane belts | `deckHeights.high` | every product in the lanes floated 0.37 above its own belt |
| `FormedCarton` | deck − 0.22 | pack rode *through* the chain carriers carrying it |
| `ChainInfeed` chain loop | lower run at 3.13 | all five pusher plates swept underneath the formation without touching it |
| transfer pusher plate | top face exactly at the deck | same — passed under the product it pushes |

### Things that acted on empty air

- **`SidePushers`** closed to z = ±1.25 against a formation ±0.56 wide.
- **`GlueStation`** heads at ±1.55 and rails at ±2.08 against carton walls at
  ±0.56 — the whole station stood a unit outboard of what it glues.
- **`EdgeFlapFolders`** stood at x = 13.2 while the pack is between 10.2 and 12.1
  during the fold window, so the blades closed and reopened before it arrived.
  `FOLDER_X` is now derived by inverting the `packX` ramp over the fold window.
- **`DividerModule`** stood 1.5 units *inside* the infeed belt, sharing space with
  it. `DIVIDER_X` now comes from the grouping zone and the belt ends at the
  divider's upstream face.
- **The product clamp** sat at the lane entry, nine units from any product, and
  was 1.48 deep — spanning all three lanes at once.
- **The inner blank shaft** stood 0.8 downstream of `zones.blankWithdraw`, and the
  hold-downs were positioned on where it used to be.

### Motion

- **`SidePushers`** applied the poll value straight to `position` during render,
  so the guides stepped twice a second while everything around them glided. Now
  damped in `useFrame` like the rest.
- **`TransportChains`** counter-rotated: the upper chain scrolled −x while the
  lower scrolled +x, though both present their working run to the same carton.
  Its height adjustment also used a fixed `* 0.08` step, making the lift speed
  frame-rate dependent — the one remaining instance of the bug `damp()` was
  introduced to kill.
- **`FormedCarton`** swerved 2.4 in Z on a reject *and* `RejectConveyor` drew the
  diverted pack, so a reject put two packs on screen taking different routes. The
  branch now owns the divert; the carton is tinted instead.

### Shared-material collisions

The registry's contract is that a dynamic-emissive material has exactly one
owner. Two were being written by more than one component each frame, so which
value survived depended on scene traversal order: `amberOn` (`GlueStation`
nozzles vs `FormedCarton` seals vs the divider arms). Split into `amberOn` (glue
only), `glueSeal` (carton) and `amberStatic` (divider).

`EdgeFlapFolders` also built its torus blade in a `useMemo` and never disposed
it — one leaked geometry per mount, of the exact kind the refcounted cache
exists to prevent. Now a module-level constant.

### Second pass: the static frame and the blank path

The first pass fixed the moving stations. Re-running the same two questions over
the static structure and the handover points found seven more.

**The blank arrived 0.62 below the deck it is pushed onto.**
`blankPath.transferY` was 2.82 while `deckHeights.products` is 3.44, so the lift
ramp delivered the blank *under* the transfer deck, the chain infeed pushed the
formation onto nothing, and the pack jumped 0.62 upward the instant the blank
became a carton. `sampleBlankPath` and `BlankLiftPath` both read this value, so
correcting it moves the ramp, its rails, the drivers and the travelling blank
together — the payoff for having one path function.

**A second, disagreeing blank path.** `useMachineSceneModel` computed `blankY` and
`blankPitch` off `blankPath.lowY` (1.08) while `sampleBlankPath` uses
`deckHeights.lowTransport + 0.1` (0.98). Nothing consumed the hook's version —
`FlatBlank` takes only x and z and samples the path itself. Deleted, along with
four other fields (`slugCompression`, `targetGroupCount`, `lastRejectReason`,
`laneFillOk`) that were recomputed on every poll and read by nobody.

**Structure that had not followed its station.**

- The divider's frame pedestal stayed at x = -12.3 when the divider moved to
  -11.6, so the divider stood beside its own bed. Now imports `DIVIDER_X`.
- `highTransportDeck` ran to x = 20.1 against a base shell ending at 18.25 —
  nearly two units of deck hanging off the end of the machine.
- `TrayStation`'s blank hold-downs were positioned on where the inner shaft used
  to be. Now bracket `SHAFT_X`.
- The reject branch was keyed to `deckHeights.high`, so after the pack was raised
  onto the chain it discharged at 3.46 into a chute at 2.96.
- Three floor placards named the wrong station: BLANK WITHDRAW sat 2.2 downstream
  of `zones.blankWithdraw`, SEPARATOR + GROUPING 1.4 upstream of `zones.grouping`,
  and OUTFEED at x = 19, past the end of the machine. All anchors now read their X
  from the zone table.

Camera presets and flow arrows were checked against the same table and are
correct; `TransportGuides` was already fully derived from the tray footprint and
needed no change.

## Cycle-repeat motion, and six stations reworked

### The blank ran backwards at the cycle boundary

Two independent causes, both of which had to go.

**Parts kept damping while off screen.** `FlatBlank` travels to x = 16 by the end
of DISCHARGE; its target then resets to the magazine at x = -13.4 for the next
cycle. The part is hidden in between — but `useFrame` still runs, and in
`FlatBlank`'s case the early `if (!mesh) return` guard meant the follow was
*skipped* while hidden and the displayed X stayed frozen at the discharge. Come
the next BLANK_FEED it reappeared 29 units downstream of its target and slid
**backwards up the machine** to catch up. `FormedCarton` had the same shape via
its panel guard. Both now track position in refs updated before the guard, using
a new `dampVisible()` that follows the target exactly while hidden — so a part is
always in position the instant it appears.

**A backwards step written into the phase table.** The blank's own X ramp ran
`transferX -> packingX + 1.6` (5.3 -> 7.7) through PACKING, then DISCHARGE
restarted it at `packingX` (6.1) — behind where PACKING left it. It was also being
drawn *at the same time as* `FormedCarton`, which wraps around that exact board
and runs 5.3 -> 12.6, so one physical object was drawn twice, five units apart and
diverging. The flat blank now ends at TRANSFER and hands straight to the carton;
both sit at x 5.3 at the boundary, so the handover is invisible.

### The chain infeed lagged

`ProductSlug` damps `slugX` so the formation glides; `ChainInfeed` locked its
pusher plates to the **raw polled** `slugX`. So the plates chased a 2 Hz staircase
while the formation they were pushing moved smoothly — falling behind, then
snapping forward, twice a second. `animation/slugTracker.ts` publishes the
formation's damped X; the plates lock to that. The lock itself was also rewritten:
plates are evenly spaced at `1/N`, so `phase = wanted - i/N` puts plate `i` on
target for any integer `i`, and picking the `i` nearest the current phase keeps the
chain continuous instead of jumping between plates mid-push.

The **blank transport** had the identical fault and now uses the identical fix
(`animation/blankTracker.ts`). Its drivers free-ran at a fixed `delta * 0.09` with
no relation to the board they exist to push, so they slid straight through it.
A driver now rides against the blank's trailing edge while it is in transit and
free-runs only when the transport is empty. The run also started 2.7 units
upstream of the suction arm's deposit point, so a third of every driver's travel
carried nothing; it now starts where blanks are actually put down.

### Stations

**Divider.** Was a box translating sideways. Now rides a visible linear rail,
leans into its travel at a rate taken from its own measured movement, and strokes
its pusher head — retracted while seeking a lane, extended once settled on it and
the gap sensor is clear. That stroke is the entire point of the mechanism and was
not modelled.

**Grouping gates.** The stopper and terminal blades hung in mid-air on nothing.
Each is now a pneumatic gate: cylinder body, and a rod whose visible extension is
*derived from the blade position* rather than animated separately, so the two can
never disagree. At the overview camera the blade is a few pixels tall and the rod
is what makes the stroke legible. Added the per-lane filling-control sensors
(OI 5-12 item 3), which the grouping unit had been missing entirely — most of why
it read as three bare belts rather than a controlled station.

**Outer blank magazine height.** The worst of the remaining height errors: feed
rollers at 0.58 carrying blank stacks drawn at 2.38, so the stacks floated 1.7
above the rollers that drive them, behind a 1.8-tall cabinet connected to neither.
The magazine also stood *taller* than the cross transfer it feeds, which is
backwards — blanks travel upward from here. The chain is now monotonic: roller top
0.70 -> cross-transfer top 1.14 -> shaft mouth 1.72, with a ramp between the first
two and the cabinet reduced to the base the rollers actually sit on.

## Visual verification run

Harness output after the alignment work:

```
3dsim  calls 142  programs 16  geometries 77  textures 8  tris 10384  meshes 143  casters 45
/state 2.0 req/s (1 poll loop)
leak check: merged geometries 51 -> 51 over 8 mount/unmount cycles
```

`fps` from this harness is meaningless — headless Chromium falls back to
SwiftShader. It is reported only so a change in it is visible; it is not a
budget.

The captures found five things that no amount of reading the coordinates would
have caught.

### The machine had no base shell

The harness reports page errors, and the first run printed:

```
THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index 1.
```

`mergeGeometries` requires every input to agree about having an index.
`BoxGeometry` and `CylinderGeometry` are indexed; `RoundedBoxGeometry` converts
itself to non-indexed in its constructor. Any bucket holding both returned null,
and `mergeStaticParts` silently skipped the whole group.

`MachineFrame`'s `frameDark` cast bucket holds the rounded base shell **and** the
six square cross members — so the machine had been rendering with no base shell
and no cross members at all, which is why it read as equipment scattered on a flat
plate. `buildPartGeometry` now normalises to non-indexed. Draw calls went *down*
(158 -> 142) despite drawing more, because the recovered bucket merges into one.

### Every camera preset was an overview

Orthographic zoom is pixels per world unit. At the ~1130 px canvas the station
presets' 26-31 showed 36-43 world units — the whole 35-unit machine. All six
"station" views were the same shot from six headings. Station zoom is now 78
(~14 units). `OrbitControls maxZoom` had to go up with it: it clamps
`camera.zoom` on its next update, so a maxZoom of 44 was silently undoing every
preset the frame after it was applied.

### Three placards on top of each other

BLANK MAGAZINE / CROSS TRANSFER / BLANK WITHDRAW are 1.2 apart in X — about 30 px
at the overview camera against ~110 px of text. Fanned out in Z.

### Two things standing on nothing

- The "to further processing" outfeed belt runs past the end of the machine base,
  which is correct, but had no legs — it hung in mid-air three units off the frame.
- The five glue applicators hung over the transport with no mounting at all.
  Each now brackets across and down onto the glue rail beside it.

### Known and unresolved

The grouping deck is mostly empty: the zone is 5.8 deep (normalised from the OEM
plan view) while three lanes at the cb 12 format pitch occupy 1.1 of it. Both
numbers are sourced, and the manual itself notes the plan view shows more lanes
than the cb 12 format has — so this is the format-variant tension recorded in
PLAN.md surfacing visually, not a coordinate error. Left alone deliberately.
