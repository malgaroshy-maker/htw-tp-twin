import { memo } from 'react';
import { MACHINE_LAYOUT_3D, MM } from '../../../machineLayout';
import { materials } from '../../core/materials';
import { useMergedParts } from '../../core/useMergedParts';
import type { StaticPart } from '../../core/merge';
import { SHAFT_X, SHAFT_Z } from '../blank/shaftGeometry';

const { zones, deckHeights, blankPath } = MACHINE_LAYOUT_3D;
const CAST = { castShadow: true, receiveShadow: true } as const;

/** The manual specifies at least 20 mm between adjacent blank stacks. */
const STACK_GAP = 20 * MM;

/**
 * Static structure of the blank magazine, cross transfer and blank withdraw.
 *
 * Four separate blank stacks with the >=20 mm gap the manual specifies, driven
 * against an end stop by the feed rollers (OI 5-25, OT p12).
 *
 * The inner blank guide shaft the cross transfer actually feeds is a separate
 * component (`InnerMagazine`); the hold-downs here bracket its mouth, so their X
 * comes from `SHAFT_X` rather than from three fixed numbers that were centred on
 * where the shaft used to be.
 */
/*
 * Heights of the outer magazine, which were badly out.
 *
 * The feed rollers sat at `deckHeights.low` (0.58) but the blank stacks they
 * carry were at 2.38 — the stacks floated 1.7 above their own rollers, with a
 * 1.8-tall cabinet behind them and nothing connecting the two. The magazine also
 * read as taller than the cross transfer it hands to, which is backwards: the
 * blanks travel *up* from here, through the cross transfer, into the shaft.
 *
 * The chain is now monotonic:
 *   roller top 0.70  ->  cross-transfer top 1.14  ->  shaft mouth 1.72
 */
const ROLLER_D = 0.24;
const ROLLER_TOP = deckHeights.low + ROLLER_D / 2;
const SHEET_T = 0.08;
const STACK_SHEETS = 5;
const CROSS_TRANSFER_TOP = MACHINE_LAYOUT_3D.deckHeights.blank + 0.06;

const PARTS: StaticPart[] = [
  // Magazine cabinet: the base the rollers are mounted on, so it sits *under*
  // them rather than towering behind the stacks.
  {
    mat: 'frame',
    size: [3.8, deckHeights.low, 2.0],
    pos: [zones.blankMagazine.x - 0.2, deckHeights.low / 2, zones.blankMagazine.z],
    ...CAST,
  },

  // Feed rollers
  ...Array.from({ length: 8 }, (_, i) => ({
    mat: 'steelLight' as const,
    shape: 'cylinder' as const,
    size: [ROLLER_D, 2.6, ROLLER_D] as [number, number, number],
    pos: [zones.blankMagazine.x - 2.1 + i * 0.58, deckHeights.low, zones.blankMagazine.z] as [number, number, number],
    rot: [0, 0, Math.PI / 2] as [number, number, number],
    ...CAST,
  })),

  // Blank stacks: the magazine holds FOUR separate stacks with a >=20 mm gap
  // between them, not one continuous pile (OI 5-25 / OT p12). They rest ON the
  // feed rollers that drive them against the end stop.
  ...[0, 1, 2, 3].flatMap((stack) =>
    Array.from({ length: STACK_SHEETS }, (_, i) => ({
      mat: 'cartonAmber' as const,
      size: [0.62, SHEET_T * 0.9, 1.5] as [number, number, number],
      pos: [
        zones.blankMagazine.x - 1.15 + stack * (0.62 + STACK_GAP),
        ROLLER_TOP + SHEET_T / 2 + i * SHEET_T,
        zones.blankMagazine.z,
      ] as [number, number, number],
      ...CAST,
    }))
  ),

  // End stop the stacks are driven against (OI 5-25 item 4). Tall enough to hold
  // the stack it stops, and standing on the same rollers.
  {
    mat: 'steelLight',
    size: [0.12, STACK_SHEETS * SHEET_T + 0.5, 2.2],
    pos: [
      zones.blankMagazine.x + 1.55,
      ROLLER_TOP + (STACK_SHEETS * SHEET_T + 0.5) / 2,
      zones.blankMagazine.z,
    ],
    ...CAST,
  },

  // Cross transfer plate: the next step up, taking blanks from the magazine
  // toward the inner shaft.
  {
    mat: 'beltGreenDeep',
    size: [zones.crossTransfer.width, 0.12, zones.crossTransfer.depth],
    pos: [zones.crossTransfer.x, CROSS_TRANSFER_TOP - 0.06, zones.crossTransfer.z],
    ...CAST,
  },
  // Ramp carrying the stack from roller height up to the cross transfer
  {
    mat: 'steelMid',
    size: [1.5, 0.06, 1.9],
    pos: [
      (zones.blankMagazine.x + 1.9 + zones.crossTransfer.x - zones.crossTransfer.width / 2) / 2,
      (ROLLER_TOP + CROSS_TRANSFER_TOP) / 2,
      (zones.blankMagazine.z + zones.crossTransfer.z) / 2,
    ],
    rot: [0, 0, -Math.atan2(CROSS_TRANSFER_TOP - ROLLER_TOP, 1.5)],
    ...CAST,
  },

  // Blank hold-downs, both sides (OI 5-33 item 2)
  ...[SHAFT_Z - 0.78, SHAFT_Z + 0.8].flatMap((z) =>
    [SHAFT_X - 0.9, SHAFT_X, SHAFT_X + 0.9].map((x) => ({
      mat: 'steelLight' as const,
      size: [0.1, 0.72, 0.18] as [number, number, number],
      pos: [x, 2.38, z] as [number, number, number],
      ...CAST,
    }))
  ),

  // Withdraw rail
  {
    mat: 'steelDark',
    size: [3.6, 0.08, 0.2],
    pos: [zones.blankWithdraw.x - 0.2, 1.58, blankPath.z],
    receiveShadow: true,
  },
];

export const TrayStation = memo(function TrayStation() {
  const groups = useMergedParts('TrayStation', () => PARTS);
  const mats = materials();

  return (
    <group>
      {groups.map((g) => (
        <mesh
          key={g.key}
          geometry={g.geometry}
          material={mats[g.mat]}
          castShadow={g.castShadow}
          receiveShadow={g.receiveShadow}
        />
      ))}
    </group>
  );
});
