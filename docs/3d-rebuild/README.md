# 3D Model Rebuild — working folder

Optimizing and rebuilding the 3D tray packer scene
(`app/dashboard/src/features/simulation/SimulationView3D.tsx`).

| File | What it is |
|---|---|
| `PLAN.md` | The implementation plan — architecture, phases, verification targets |
| `PERF.md` | **Measurements and phase status.** Start here for what has actually changed |
| `MACHINE_REFERENCE.md` | Machine ground truth extracted from the OEM PDFs; the acceptance criterion for geometry |
| `media/` | Pages rendered from `docs/365257_18_OI.pdf` at 150 dpi — the CAD figures the geometry work is checked against |
| `captures/` | Harness output (gitignored — regenerate with `npm run capture3d`) |

## Phase status

Done: 0 (instrumentation) · 1 (poll loops) · 2 (registries + decomposition) · 5 (lighting)
Partial: 3 (motion — damped follow in, full `SceneMotion` refactor out)
Not started: 4 (static merging) · 6 (geometry corrections) · 7 (overlay cleanup)

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

## Reproducing a page render

Chapter 5 maps section `5-N` to PDF page `255+N`:

```python
import fitz
d = fitz.open('docs/365257_18_OI.pdf')
d[255 + 38 - 1].get_pixmap(dpi=150).save('5-38.png')   # main transport
```
