# 3D Model Rebuild — working folder

Optimizing and rebuilding the 3D tray packer scene
(`app/dashboard/src/features/simulation/SimulationView3D.tsx`).

| File | What it is |
|---|---|
| `PLAN.md` | The implementation plan — architecture, phases, verification targets |
| `PERF.md` | **Measurements and phase status.** Start here for what has actually changed |
| `MACHINE_REFERENCE.md` | Machine ground truth extracted from the OEM PDFs; the acceptance criterion for geometry |
| `media/` | **Local only, not in git.** Pages rendered from `docs/365257_18_OI.pdf` at 150 dpi — the CAD figures the geometry work is checked against. Regenerate with the snippet below. |
| `captures/` | Harness output. **Local only** — regenerate with `npm run capture3d` |

## Phase status — all complete

| Phase | |
|---|---|
| 0 | Instrumentation harness (`npm run capture3d`) |
| 1 | Nine poll loops collapsed to one context |
| 2 | Asset registries, decomposition, dead code removed |
| 3 | Frame-rate-independent damped motion |
| 4 | Static geometry merging |
| 5 | Environment lighting, no CDN dependency |
| 6 | Geometry corrected against the OEM figures; missing stations added |
| 7 | Labels projected into a DOM layer outside the Canvas |

`SimulationView3D.tsx` 1427 → ~360 lines · geometries 235 → 73 · shadow casters
140 → 56 · `<Html>` 15 → 2 · geometry leak 63/mount → 0.

The plan's ≤60 draw-call target is **withdrawn as unfounded** — it was set before
measurement, on two premises that measurement disproved. See `PERF.md`.

## Working on this scene

Read `../../app/dashboard/src/features/simulation/scene3d/README.md` first — it
carries the rules (never declare an inline material or geometry; binary state
swaps two registry materials; merged geometry goes through `useMergedParts`).

Verify with:

```bash
cd app/dashboard
npm run typecheck   # tsc -b --force. `npx tsc --noEmit` is a NO-OP here: the
                    # root tsconfig is solution-style and checks zero files.
npm run lint
npm run capture3d   # poll rate, renderer counters, captures, leak check
```

## media/ index

| File | Source | Why it matters |
|---|---|---|
| `02-03_plant-installation-layout.png` | OI p29 | Identifies the machine as a Meurer CM/HTW 650 |
| `02-23_formats-table.png` | OI 2-23 | Real product / tray / formation dimensions |
| `05-00_machine-overview-plan.png` | OI 5-3 | **Top-down plan keying every function module** |
| `05-05_blast-station.png` | OI 5-5 | Upstream reject-by-air station |
| `05-07_feeding.png` | OI 5-7 | Infeed belt + jam / fall-over sensors |
| `05-09_separation-and-divider.png` | OI 5-9 | Separator, divider, width adjustment |
| `05-11_grouping-unit_text.png` | OI 5-11 | Grouping sequence description |
| `05-12_grouping-unit_cad.png` | OI 5-12 | **Grouping CAD** — lanes, clamp, chain stopper |
| `05-13_grouping-unit_adjust.png` | OI 5-13 | Grouping adjustment detail |
| `05-17_chain-infeed_text.png` | OI 5-17 | Chain infeed description |
| `05-18_chain-infeed_cad.png` | OI 5-18 | **Chain infeed CAD** — portal arch, 5 pusher plates, 3-D camera |
| `05-25_blank-magazine-cross-transfer.png` | OI 5-25 | Roller conveyors, cross transfer, limit stop |
| `05-33_blank-withdraw.png` | OI 5-33 | Suction arm, hold-downs, blank guide shaft |
| `05-34_blank-transport-drivers.png` | OI 5-34 | Chain drivers + curved guide plate |
| `05-38_main-transport_cad.png` | OI 5-38 | **Main transport CAD** — 5 glue guns, edge flap folders, upper folding mechanism |
| `05-51_flap-detection.png` | OI 5-51 | Open-flap detection |
| `05-55_outfeed_text.png` | OI 5-55 | Outfeed description |
| `05-56_outfeed_cad.png` | OI 5-56 | **Outfeed CAD** — reject conveyor, discharge roller track, safety roll |

## Why the source documents are not in git

This repository is public. The OEM operating instructions and the SIG training
decks are the manufacturer's copyrighted material, and the training decks carry
an individual's name on every page, so they are gitignored along with the pages
rendered from them.

`MACHINE_REFERENCE.md` records every fact extracted from them — parts lists,
formats, the sensor inventory — which is what the geometry work actually needs.
Put the three PDFs in `docs/` locally and re-render any figure with the snippet
below.

> Note: the three PDFs were present in this repository's initial commit and are
> therefore still reachable in the published git history. Untracking them stops
> further exposure but does not remove them from history; that needs a history
> rewrite and a force push, or making the repository private.

## Reproducing a page render

Chapter 5 maps section `5-N` to PDF page `255+N`:

```python
import fitz
d = fitz.open('docs/365257_18_OI.pdf')
d[255 + 38 - 1].get_pixmap(dpi=150).save('5-38.png')   # main transport
```
