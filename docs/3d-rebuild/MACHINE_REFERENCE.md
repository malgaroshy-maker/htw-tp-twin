# Machine Reference — extracted from the OEM PDFs

Ground truth for the 3D model rebuild, extracted directly from the source PDFs in `docs/`
(not from the earlier `docs/manual_extracts/` slide crops).

**Machine:** Meurer **CM/HTW 650** — high-speed tray and wrap-around packer.
Confirmed on the plant installation drawing, `365257_18_OI.pdf` p29.

## Source map

| Source | What it gives |
|---|---|
| `docs/365257_18_OI.pdf` (529 pp) | Meurer operating instructions. **Chapter 5 = numbered CAD figures of every function module.** Page mapping: section `5-N` → PDF page `255+N`. Formats table at `2-23` → PDF page 48. |
| `docs/HTW_sensors (2).pdf` (18 pp) | Full sensor inventory, 5 station groups, 35 sensors |
| `docs/OT traypacker HTW CBOB .pdf` (17 pp) | Operator training deck; photos of the real machine |

Rendered pages are in `media/`, named `<section>_<topic>.png`.

## Module chain

From the keyed top-down plan view (OI 5-3, `media/05-00_machine-overview-plan.png`):

```
Blast station 5-5
  → Feeding 5-7
    → Separation and divider 5-9
      → Grouping unit 5-11
        → Chain infeed pusher 5-17
          → Main transport 5-37 / Glue application 5-49
            → Flap detection 5-51
              → Outfeed and discharging 5-55

Blank magazine and cross transfer 5-25   (runs ALONGSIDE the grouping section)
Blank withdraw 5-33                      (crosses OVERHEAD)
```

## Parts lists (from the numbered figures)

### Grouping unit — OI 5-12
1 Transport lanes (blue belts, **staggered echelon**, not aligned) · 2 Product clamp ·
3 Control sensors lane filling (optional) · 4 Clamp conveyor · 5 Chain stopper ·
6 Separation conveyor · 7 Chain infeed · 8 Gap control sensor

### Chain infeed pusher — OI 5-18
1 Product guides –Alignment station– · 2 Product guides –Chain infeed pusher– ·
3 **Pusher plates ×5** · 4 Feed conveyor · 5 Sensor –Gap monitoring– ·
6 **3-D camera –Completeness control–**

> Dominant visual element: a large **portal/arch side-frame pair**. Absent from the current model.

### Main transport — OI 5-38
1 Main transport · 2 Lateral guides · 3 **Edge flap folders ×2** ·
4 **Upper blank guides ×2** · 5 **Lower blank guides ×2** · 6 Monitoring sensor ·
7 **Glueing guns ×5** · 8 **Lower pressure guides** (row of rollers) ·
9 **Upper pressure guides** · 10 **Upper folding mechanism** (with a large drum/pulley
at its upstream end)

> Current model has 2 glue nozzles and a single belt. Real machine has 5 guns and
> **separate upper + lower transport chains**.

### Blank magazine and cross transfer — OI 5-25
1 Roller conveyor –Feed location– · 2 Roller conveyor –Cross transfer– ·
3 Transport belts –Cross transfer– · 4 Limit stop (tall vertical plate)

Blanks sit as **separate stacks with a ≥20 mm gap** between them.

### Blank withdraw — OI 5-33 / 5-34
1 Sensor blank monitoring · 2 Hold-downs · 3 Suction arm · 4 Blank transport ·
5 Sensor minimum count · 6 **Drivers** (lugs on a chain), plus a swooping curved guide plate

> **New station:** the cross transfer does *not* feed the suction arm directly — it feeds
> an **inner blank guide shaft / internal tray magazine**. Corroborated by the
> "Maximum Level internal Traymagazin" sensor.

### Outfeed and discharging — OI 5-56
1 Rejection conveyor · 2 To further processing · 3 **Discharge roller track**
(gravity rollers on their own legs, branching at 90°) · 4 Product sensor of the discharge ·
5 Sensor max-jam · 6 **Safety roll** · 7 Sensor safety roll

## Formats — OI 2-23 (`media/02-23_formats-table.png`)

Format **cb 12**:

| | | | |
|---|---|---|---|
| Product base | 47 × 33 mm | | |
| Product height | 63 / 86 / 110 / 122 mm | | |
| Volume | 80 / 125 / 160 / 180 ml | | |
| Formation | 3 × 8 | 3 × 9 | 3 × 10 |
| Tray footprint | 310 × 145 mm | 345 × 145 | 382 × 145 |
| Capacity | 24's | 27's | 30's |
| Cartons / min | 20.0 | 17.8 | 16.0 |

Carton form: standard tray / wrap-around tray. Board: B-, C- or E-flute.

**Derived proportions the 3D model must honour**

- Products are **tall slim cartons** (47 × 33 base, up to 122 tall) — not the near-cubes
  currently rendered via `productSize3D: 0.46`.
- Tray is **~2.4 : 1** (382 × 145), not square.
- Lane pitch = 145 / 3 ≈ **48 mm**, replacing the arbitrary `laneSpread: 1.55`.
- `grid_rows = 3` is confirmed correct.

## Sensor inventory — `HTW_sensors (2).pdf`

35 sensors across 5 groups. `simTypes.ts` currently models 11.

**Divider (6)** — min-jam + falling-down · count · gap control · **encoder** (measures pack
length so the controller catches two packs together) · divider-movement proximity · lane control

**Main machine (14)** — infeed-pusher gap control · chain-infeed-pusher proximity ·
edge flap folder **right** proximity · tray sensor release **crosswise** gluing ·
tray sensor release gluing · **upper transport chain** proximity ·
**lower transport chain** proximity · edge flap folder **left** proximity ·
transport-chain gap control · open tray-flap detection ·
**upper-chain height-adjustment limit sensors** (the upper chain is height-adjustable) ·
central-lubrication pressure · completeness detection

**Tray feeding (8)** — tray-withdraw proximity · holding-flap-closed ·
tray-in-position · **internal tray magazine max level** · side-guide-closed ·
tray detection in transport · upper tray guides L/R · tray transport L/R

**Tray magazine (4)** — trayfeeding empty · transfer trayfeeding · cross-conveyor empty ·
cross-conveyor tray query

**Maintenance unit (3)** — air pressure hi/lo · grease float · oil float

Plus an entirely unmodelled **Stack and Turning station** (sensors PDF p10).

## Colour language

From the CAD renders and training photos:

| Element | Colour |
|---|---|
| Frame, guards, rails | Brushed stainless |
| Grouping transport lanes | **Blue** belts |
| Main transport chain | **Green** modular plastic |
| Edge flap folders, glue-gun bodies | Black rubber / dark |
| Blanks | Cream / tan corrugated |
| Levelling feet | Purple-blue |

## Open question

The 5-3 plan view and the 5-12 render both show **more grouping lanes** than the format
table's 3. These reconcile if the drawings depict a wider format variant of the CM/HTW
family. **Do not hardcode a lane count** — drive it from `cfg.grid_rows` / `cfg.grid_cols`
as `getLaneZ3D()` in `machineLayout.ts` already does.
