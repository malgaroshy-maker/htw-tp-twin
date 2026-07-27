# 3D Tray Packer Model — Optimize, Rebuild, Polish

## Context

`app/dashboard/src/features/simulation/SimulationView3D.tsx` renders the 3D digital twin of the tray packer. It works, but has four problems the user confirmed all matter:

1. **It stutters.** No interpolation between backend polls, so motion steps twice a second. The 2D view already solved this (`useMachineAnimation.ts:6`, `SNAPSHOT_BLEND_MS = 1200`); 3D never got it.
2. **It's slow.** 205 meshes, 94 distinct inline materials, 97 separate box geometries, ~250 draw calls, ~90 shader programs, `ContactShadows` re-rendering the scene every frame, 6 lights, 15 drei `<Html>` overlays each writing to the DOM per frame.
3. **It doesn't look like the real machine.** See the ground truth below — the gap is much wider than "a few missing parts".
4. **It looks cheap.** `<Environment>` was removed (`:1036`, CDN 503s) and compensated with `ambientLight intensity={1.2}`. Ambient light gives zero specular and zero reflection, so stainless steel renders as grey plastic.

**Outcome:** a scene that holds frame rate, moves smoothly between polls, matches the real machine's stations and proportions, and lives in readable files instead of one 1427-line module.

### Two findings that reorder the work

**A. Nine poll loops.** `useSimulator` is a **plain hook, not a context**, called in 9 places — `Layout.tsx:11`, `Overview.tsx:33`, `Control.tsx:74`, `Diagnostics.tsx:96`, `Faults.tsx:47`, `Production.tsx:31`, `Recipe.tsx:24`, `Training.tsx:142`, `ThreeDSimPage.tsx:69`. Each owns its own `setInterval(500)` and its own state tree. On Overview that's **2 concurrent poll loops** driving the 3D scene, and `isAutoTickEnabled` in `Layout.tsx` is a **dead toggle** — it mutates an instance nobody else reads. This contributes more to the stutter than anything in the R3F tree.

**B. The machine is a Meurer CM/HTW, and the manual has CAD drawings of every module.** Extracted below.

---

## Machine ground truth (from the PDFs, not the pre-extracted images)

Source: `docs/365257_18_OI.pdf` (Meurer operating instructions, 529 pp; chapter 5 "Explanation of the function modules" maps `5-N` → PDF page `255+N`), `docs/HTW_sensors (2).pdf`, `docs/OT traypacker HTW CBOB .pdf`.

**Machine:** Meurer CM/HTW 650, high-speed tray and wrap-around packer (plant layout, PDF p29).

**Module chain (OI 5-3 plan view, PDF p258)** — a single top-down drawing keying every module:
`Blast station 5-5 → Feeding 5-7 → Separation and divider 5-9 → Grouping unit 5-11 → Chain infeed pusher 5-17 → Main transport 5-37 → Glue application 5-49 → Flap detection 5-51 → Outfeed and discharging 5-55`, with `Blank magazine and cross transfer 5-25` running **alongside** the grouping section and `Blank withdraw 5-33` crossing **overhead**.

**Real parts lists** (each from the numbered CAD figure):

- **Grouping unit (5-12):** transport lanes (blue belts, arranged in a **staggered echelon**, not aligned), product clamp, lane-filling control sensors, clamp conveyor, chain stopper, separation conveyor, chain infeed, gap control sensor.
- **Chain infeed pusher (5-18):** a large **portal/arch side-frame pair** — a dominant visual element entirely absent today. Product guides (alignment station), product guides (chain infeed pusher), **5 pusher plates**, feed conveyor, gap monitoring sensor, **3-D camera (completeness control)**.
- **Main transport (5-38):** main transport, lateral guides, **edge flap folders ×2**, **upper blank guides ×2**, **lower blank guides ×2**, monitoring sensor, **5 glueing guns** (not 2 nozzles), **lower pressure guides** (a row of rollers), **upper pressure guides**, **upper folding mechanism** with a large drum/pulley at its upstream end.
- **Blank magazine (5-25):** roller conveyor (feed location), roller conveyor (cross transfer), transport belts (cross transfer), and a tall vertical **limit stop** plate. Blanks sit as **separate stacks with a ≥20 mm gap**.
- **Blank withdraw (5-33/5-34):** blank-monitoring sensor, **hold-downs**, suction arm, blank transport with **drivers (lugs on a chain)** and a swooping curved guide plate, minimum-count sensor. Critically, the cross transfer does **not** feed the suction arm directly — it feeds an **inner blank guide shaft / internal tray magazine**, a separate station.
- **Outfeed (5-56):** rejection conveyor, "to further processing" belt, **discharge roller track** (gravity rollers on their own legs, branching at 90°), discharge product sensor, max-jam sensor, **safety roll** + its sensor.

**Formats (OI 2-23, PDF p48)** — real proportions:
- Product: base **47 × 33 mm**, height **63 / 86 / 110 / 122 mm** (80–180 ml cartons). These are **tall slim cartons**, not the near-cubes currently rendered (`productSize3D: 0.46`).
- Formation: **3 × 8, 3 × 9, 3 × 10**; tray footprint **310 / 345 / 382 × 145 mm**. So the tray is ~2.4× longer than wide, and 3 across × 145 mm confirms `grid_rows = 3`.
- Throughput 16–20 cartons/min. Carton form: standard tray / wrap-around; B/C/E flute.

**Full sensor inventory (`HTW_sensors`, 5 station groups)** — far richer than the 11 tags currently in `simTypes.ts`:
- *Divider (6):* min-jam + falling-down, count, gap control, **encoder** (measures pack length to catch two packs together), divider-movement proximity, lane control.
- *Main machine (14):* infeed-pusher gap control, chain-infeed-pusher proximity, **edge flap folder left + right** proximities, **tray sensor release crosswise gluing**, **tray sensor release gluing**, **upper transport chain** proximity, **lower transport chain** proximity, transport-chain gap control, open tray-flap detection, **upper-chain height-adjustment limit sensors** (the upper chain is height-adjustable), central-lubrication pressure, completeness detection.
- *Tray feeding (8):* tray-withdraw proximity, holding-flap-closed, tray-in-position, **internal tray magazine max level**, side-guide-closed, tray detection in transport, upper tray guides L/R, tray transport L/R.
- *Tray magazine (4):* trayfeeding empty, transfer trayfeeding, cross-conveyor empty, cross-conveyor tray query.
- *Maintenance unit (3):* air pressure hi/lo, grease float, oil float.
- Plus an entirely unmodelled **Stack and Turning station**.

**Colour language** (from the CAD renders and photos): brushed stainless frame and guards, **blue** lane belts in the grouping unit, **green** modular plastic chain on the transport, black rubber flap folders and glue-gun bodies, cream/tan corrugated blanks, **purple/blue adjustable levelling feet** on the legs.

### One open question, flagged not guessed

The 5-3 plan view and the 5-12 render both show noticeably **more grouping lanes** than the 3 the model renders, while the format table gives `3 × 8..10`. These reconcile if the drawings depict a wider format variant of the CM/HTW family. **Resolution:** drive lane count from `cfg.grid_rows`/`grid_cols` (as `getLaneZ3D` already does) rather than hardcoding, and size lane pitch from the 145 mm / 3 = ~48 mm real pitch. Do not hardcode 8.

---

## Architecture

### Target file layout

```
features/simulation/
  SimulationView3D.tsx        # ~30-line shim -> <MachineCanvas/>; keeps both lazy() call sites working
  machineLayout.ts            # EXTENDED, stays the single source of coordinates
  animation/
    constants.ts              # SNAPSHOT_BLEND_MS, VISUAL_SPEED_SCALE — shared by 2D and 3D
    useSnapshotClock.ts       # blend clock, returns a ref (no setState)
    computeSceneMotion.ts     # pure fn, writes into a preallocated object
  scene3d/
    MachineCanvas.tsx         # Canvas, env, lights, tone mapping, ContactShadows, CameraRig
    MachineScene.tsx          # composition only; all children React.memo
    SceneAnimator.tsx         # THE single useFrame
    core/  palette.ts  materials.ts  geometries.ts  textures.ts  primitives.tsx  types.ts
    parts/ static/ blank/ product/ transport/ sensors/ overlay/
    hud/   SceneHud.tsx  JogButtonLayer.tsx   # plain DOM, outside the Canvas
```

### Three principles

**1. Motion never travels through React props.**
Split `useMachineSceneModel` (currently called twice — `SimulationView3D.tsx:1008` and `:1338`) into:
- `SceneStatics` — `rowCount`, `colCount`, `machineMode`, `phase`, `faultCode`. One `useMemo`, hoisted to a single call, passed to both HUD and scene. Changes rarely.
- `SceneMotion` — every numeric field (`blankX/Y/pitch`, `slugX/compression/opacity`, `pusherX`, `packX/FormProgress`, …). Computed **inside the animator into a preallocated object**, read via ref.

This one change resolves the duplicate hook, the 2 Hz full-tree reconciliation, and the unconditional per-frame instance-matrix rewrite together.

**2. One `useFrame`, not 8.** `SceneAnimator` holds the sole subscription; parts register via `useSceneUpdate(fn)`. Per frame: advance clock → `computeSceneMotion(state, progress, out)` → run updaters. Deterministic order, zero allocation.

**3. `frameloop="always"`, explicitly.** Chains scroll continuously and OrbitControls damping needs frames. The current half-implementation (no `frameloop` on `<Canvas>` at `:1411` but `invalidate()` at `:135`) is dead code — delete the `invalidate()`.

### Interpolation

Hoist the 2D blend logic (`useMachineAnimation.ts:107-142`, `:158-167`) into `animation/useSnapshotClock.ts`, with the constants moved to `animation/constants.ts` and **imported by both 2D and 3D**. Semantics carried over verbatim: blend `visualProgress` over 1200 ms when `machine_state` and `cycle_phase` are unchanged; snap across a phase boundary. Sharing the code path makes 2D and 3D provably identical.

### Materials & geometry

94 materials → ~14 in a registry: `stainlessBrushed` (MeshPhysicalMaterial, anisotropy + roughnessMap), `stainlessDark`, `frameSteel`, `guardSmoke`, `chainGreen`/`chainGreenDark`, `laneBeltBlue`, `boardCream`/`boardCreamEdge`, `cartonKraft`, `product`, `rubberBlack`, `sensorOff`/`sensorOn`. Sensor state = **swapping between two shared materials**, never creating per-sensor ones.

97 box geometries → unit primitives (`UNIT_BOX`, `UNIT_CYL`, `UNIT_PLANE`) scaled per mesh, behind readable wrappers: `<Box mat="stainlessBrushed" size={[…]}/>`.

**Static merging is the real draw-call win.** Frame, supports, decks, guards, the 36-segment blank lift path, transport bed, guide rails, arch frames: merge with `mergeGeometries` (`three/examples/jsm/utils/BufferGeometryUtils.js`) at module scope → ~60 meshes become ~4, one per material.

**Instance where it pays:** magazine sheets (count bound to `sns.blanks_remaining`), grouped-lane products, `ProductSlug`, roller-conveyor rollers, sensor posts. Allocate at a fixed maximum and mutate `.count` — this also fixes `args={[undefined, undefined, rowCount*colCount]}` (`:753`) remounting the InstancedMesh on every recipe change.

**Merge, don't instance:** flight bars, roller-track rollers, pusher plates, blank holders, ramp segments — rigid relative to each other, so one merged geometry with a translated parent beats an instance buffer.

**Transport chains: neither.** One long box per chain with a tiling chain texture scrolled via `map.offset.x`. One draw call, real motion, zero geometry updates.

**Disposal:** registries are module singletons shared by two mount points, so naive cleanup would break the other scene. Refcount via `acquireSceneAssets()`/`releaseSceneAssets()` in `MachineCanvas`; dispose at zero. This also fixes the existing leak at `:173` (`new THREE.BoxGeometry` in `useMemo`, never disposed, feeding `<edgesGeometry>` at `:189`).

### Lighting — fixing the "cheap" look with no network dependency

1. **`<Environment>` in children mode with `<Lightformer>`s** — drei 10.7 builds the PMREM from a scene you author, so no HDR file and no CDN. One large overhead rect plus a cool back fill and warm front fill; `frames={1}` bakes once → zero per-frame cost. This is what makes long stainless rails read as brushed metal.
   *Fallback:* `RoomEnvironment` + `PMREMGenerator` in `onCreated`, `scene.environmentIntensity = 0.55`. Also fully local.
2. **6 lights → 2, with a constant count.** One `directionalLight` (key, casts shadow) + `ambientLight intensity={0.15}`. **Critical:** the fault light (`:1040`) and manual-mode light (`:1045`) currently mount/unmount, forcing a full shader recompile of every material — a guaranteed hitch. Keep one always-mounted `pointLight` and vary its intensity/colour.
3. **Tone mapping** `ACESFilmicToneMapping`, exposure `1.05`.
4. **Shadows** `PCFSoftShadowMap`, key light `1024²` (down from 2048²) with a **tight ortho frustum** (the default wastes nearly all texels), `shadow-normalBias 0.02`. Cut `castShadow` from 92 meshes to ~15 large ones. `ContactShadows` → `frames={1} resolution={512}` (currently `frames={Infinity}` at `:1037` = a full extra scene render every frame for a base that never moves).
5. **Procedural textures generated once on a `<canvas>`** — brushed-steel roughness (1-D stretched noise), corrugated-board normal map, tiling modular-chain map. No assets, no network.
6. **Colour language** per the ground truth above.
7. **Fog** `[22, 44]` (`:1028`) clips a 35-unit machine at the overview camera → `['#0b1220', 34, 78]`.
8. **No post-processing.** ACES + env map is enough.

### Geometry corrections and additions, mapped onto `machineLayout.ts`

Extend the existing constants file (it stays the single source of truth). Beyond adding stations, **three existing things are wrong and get corrected**:

- **Product shape** — from a 0.46 cube to a tall slim carton at the real 47 × 33 × 63–122 mm aspect, scaled off `cfg`.
- **Tray proportion** — 310–382 × 145 mm, i.e. ~2.4:1, driving slug and formed-carton dimensions.
- **Lane pitch** — ~48 mm real pitch derived from 145/3, replacing the arbitrary `laneSpread: 1.55`.

New layout groups: `magazine` (separate stacks with the 20 mm gap, feed roller conveyor, cross-transfer roller conveyor + belts, limit stop), `innerMagazine` (the blank guide shaft — a genuinely new station), `infeed` (separator, divider, width adjustment, side frames, staggered transport lanes, stopper, terminal), `chainInfeed` (**portal arch frames**, 5 pusher plates, alignment guides, feed conveyor, 3-D camera), `trayInfeed` (guiding shaft, hold-downs, blank transport with drivers, curved guide plate), `transport` (lower + upper chain with height adjustment, 2 edge flap folders, corner cover feeder, **5 glueing guns**, upper/lower blank guides, upper/lower pressure guides, upper folding mechanism with its drum), `outfeed` (rejection conveyor, discharge roller track on its own legs, safety roll), and a `sensorPoints: SensorPoint[]` table.

The **edge flap folders** are paired `TorusGeometry` arc blades rotating `0 → -0.7 rad` driven by `packFormProgress` — that is what makes the wrap-around fold read as real rather than as scaling boxes.

### Sensor bindings

The 11 tags already in `simTypes.ts` (`stopper_closed`, `terminal_closed`, `chain_clear`, `tray_positioned`, `divider_gap_clear`, `blanks_remaining`, `lane_fill_ok`, `lane_fill_mismatch`, `tray_vacuum_ok`, `outlet_sensor_ok`, `tray_plate_sensor_ok`) get wired to 3D visuals as `emissiveIntensity` / `position.y` / material-swap writes in the animator — **zero React re-renders**. The additional sensors catalogued above are rendered as **physical sensor bodies from the `sensorPoints` table** even where no backing tag exists yet; adding a tag later is adding a row, not new geometry. Extending the simulator to actually produce those tags is **out of scope here** — it is backend work and belongs in its own change.

---

## Phases

Each is independently shippable and gates on `npm run build` + `npm run lint`. `scene3d/` is built **alongside** the existing scene; `SimulationView3D.tsx` becomes a shim and `?legacy3d=1` renders the old tree until Phase 4 lands.

**Phase 0 — Instrumentation baseline.** `r3f-perf` as a devDependency behind `?perf=1`; a dev `gl.info` probe. `scripts/capture3d.mjs` (Playwright): boot backend + `vite preview`, reset session, drive fixed `/tick` steps for determinism, screenshot 6 camera presets × 3 phases into `docs/3d-baseline/`. Record in `docs/3d-perf-budget.md`. Zero behaviour change.

**Phase 1 — State plumbing + cheap wins.** `SimulatorProvider` context; `useSimulator()` becomes `useContext` → 9 poll loops become 1, and the dead `isAutoTickEnabled` toggle starts working. Remove `console.log` (`:1012`, `:1342`) and the `setMounted` double render (`:1349-1354`). Hoist `useMachineSceneModel` to one call. `ContactShadows frames={1}`; shadow map 1024 + tight frustum; strip `castShadow` from small parts.

**Phase 2 — Asset registries + decomposition.** Build `scene3d/`, moving components one at a time; the only change per component is `<boxGeometry/><meshStandardMaterial/>` → `<Box mat="…" size={…}/>`. Delete the 12 dead SVG components in `components/` (only `Pack.tsx` is imported; leave all of `components/topdown/*`, which 2D uses).

**Phase 3 — Motion architecture.** `animation/constants.ts` + `useSnapshotClock.ts`; refactor `useMachineAnimation.ts` to consume them (2D behaviour must not change). Extract `computeSceneMotion`. Add `SceneAnimator` + `useSceneUpdate`; convert all 8 `useFrame`s and every motion prop to ref writes. `frameloop="always"`, delete `invalidate()`.

**Phase 4 — Static merging + instancing.**

**Phase 5 — Lighting & materials.** The "looks cheap" fix. Confined to `materials.ts`, `textures.ts`, `MachineCanvas.tsx` — cheap to iterate and revert. Screenshots intentionally diverge; re-bless the baseline.

**Phase 6 — Geometry, one commit each:**
- 6a **Proportion correction** — product carton aspect, tray 2.4:1, lane pitch from the format table. Do this *first*; everything downstream sizes off it.
- 6b Magazine: separate stacks + 20 mm gap + feed/cross roller conveyors + limit stop, bound to `blanks_remaining`
- 6c Inner blank guide shaft / internal magazine (new station)
- 6d Separator / divider / width adjustment / side frames / staggered transport lanes / stopper / terminal
- 6e Chain infeed: portal arch frames, 5 pusher plates, alignment guides, 3-D camera
- 6f Blank withdraw: hold-downs, guiding shaft, blank transport with drivers, curved guide plate
- 6g Main transport: split single belt into lower + upper chains; 2 edge flap folders; corner cover feeder; 5 glueing guns; upper/lower blank guides; upper/lower pressure guides; upper folding mechanism + drum
- 6h Outfeed: discharge roller track on its own legs, safety roll, sensor bodies from the `sensorPoints` table

**Phase 7 — Overlay cleanup.** `<Html>` 15 → ≤4; zone labels and jog buttons become a DOM layer outside the Canvas, positioned by projecting world points at ~5 Hz. Hover state (`:217`) leaves the R3F tree. Delete the legacy scene and the `?legacy3d=1` hatch.

---

## Verification

**Quantitative** — `r3f-perf` + `gl.info`, per camera preset, recorded in `docs/3d-perf-budget.md`:

| Metric | Now | Target |
|---|---|---|
| draw calls | 235 (measured) | ≤ 60 — **requires Phase 4 merging, not Phase 2** |
| shader programs | 8 (measured) | no action — the ~90 estimate was wrong, see PERF.md |
| geometries | 235 (measured) | ≤ 25 |
| CPU frame | — | ≤ 4 ms |
| GPU frame | — | ≤ 8 ms @1080p |
| `MachineScene` React renders between snapshots | 1 per poll × 2 loops | **0** (dev render counter asserts it) |
| `/state` requests/sec | ~18 | 2 |

**Visual, no human in the loop** — `scripts/capture3d.mjs` with Playwright + `pixelmatch`. Determinism needs (a) driving the sim with `/session/reset` + fixed `/tick` steps rather than auto-tick, and (b) a `?static=1` flag freezing the interpolation clock at `blendT=1`. Phases 1–4 must diff <2% against the Phase-0 baseline; Phases 5–6 intentionally exceed it and re-bless.

**Geometry review** — after each 6x commit, render the matching camera preset and compare side by side against the source figure (e.g. 6g against OI 5-38, 6b against OI 5-25). The figures are the acceptance criterion.

**Motion parity** — trace `packX` from the 2D and 3D paths over 3 s and assert max divergence < 0.02. Regression test for the shared clock.

**Leak check** — mount/unmount `/3dsim` 20× and assert `renderer.info.memory.geometries` and `.textures` return to baseline. Validates the refcounted registry and would have caught today's `ManualZoneHighlight` leak.

**Explicitly out of scope:** switching to WebSocket (the shared clock makes 500 ms polling visually indistinguishable, and one provider removes the redundant load); and adding the new sensor *tags* to the simulator backend.

---

## Critical files

- `app/dashboard/src/features/simulation/SimulationView3D.tsx` (1427 lines — decomposed)
- `app/dashboard/src/features/simulation/machineLayout.ts` (extended + proportions corrected)
- `app/dashboard/src/features/simulation/hooks/useMachineSceneModel.ts` (split into statics/motion)
- `app/dashboard/src/features/simulation/hooks/useMachineAnimation.ts` (blend logic hoisted out)
- `app/dashboard/src/hooks/useSimulator.ts` (→ context provider; 9 call sites updated)
- `app/dashboard/src/features/simulation/ThreeDSimPage.tsx`, `SimulationView.tsx` (mount points)
- Reference: `docs/365257_18_OI.pdf` ch. 5 (`5-N` → PDF page `255+N`) and 2-23; `docs/HTW_sensors (2).pdf`
