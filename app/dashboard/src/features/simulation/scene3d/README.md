# scene3d

The 3D machine scene, decomposed out of what used to be a single 1427-line
`SimulationView3D.tsx`.

```
core/         palette · materials · geometries · primitives · mathUtils
dev/          SceneStats (behind ?perf=1) · perfFlag
parts/
  static/     never changes after mount — merge candidates for Phase 4
  blank/      carton blank path: magazine → suction arm → lift → transfer
  product/    infeed → divider → grouping lanes → chain infeed → slug
  transport/  main transport, formed carton, reject branch
  sensors/    photo-eyes and proximity switches
  overlay/    Html labels, flow arrows, manual-mode zones and jog buttons
```

## Rules

**Never declare an inline material or geometry.** Use `<Box mat="steelLight" size={…}/>`
from `core/primitives`. Every inline `<meshStandardMaterial>` is a private instance;
the scene had ~94 of them and 235 live geometries for ~205 meshes.

**Binary state = swap two registry materials** (`mat={active ? 'sensorOn' : 'sensorOff'}`).
Do not build a material per state.

**Continuous state = a dedicated "dynamic" registry entry**, mutated by the one component
that owns it. These are listed together at the bottom of `materials.ts`. Only mutate a
dynamic material from its owning component, and only when every mesh using it shares the
same state.

**Disposal is refcounted.** Two mount points (`SimulationView` and `ThreeDSimPage`) can
hold the scene simultaneously, so `acquireSceneAssets()` / `releaseSceneAssets()` guard
teardown. Never dispose a registry entry directly.

## Fidelity notes

Several parts carry a `NOTE (Phase 6x)` comment marking where the current geometry
diverges from the real Meurer CM/HTW. The OEM CAD figures those notes reference are in
`docs/3d-rebuild/media/`, indexed by `docs/3d-rebuild/MACHINE_REFERENCE.md`. Those
figures are the acceptance criterion for the geometry phases — not "looks about right".

## Measuring

```bash
cd app/dashboard && npm run capture3d     # needs both dev servers running
```

Reports poll rate and renderer counters, and writes captures to
`docs/3d-rebuild/captures/`. Note that `fps` from this harness is meaningless —
headless Chromium rasterises in software. Draw calls and geometry counts are real.
