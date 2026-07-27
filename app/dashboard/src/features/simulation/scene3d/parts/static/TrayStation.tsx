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
const PARTS: StaticPart[] = [
  // Magazine cabinet
  {
    mat: 'frame',
    size: [3.8, 1.8, 2.0],
    pos: [zones.blankMagazine.x - 0.2, 1.58, zones.blankMagazine.z],
    ...CAST,
  },

  // Feed rollers
  ...Array.from({ length: 8 }, (_, i) => ({
    mat: 'steelLight' as const,
    shape: 'cylinder' as const,
    size: [0.24, 2.6, 0.24] as [number, number, number],
    pos: [zones.blankMagazine.x - 2.1 + i * 0.58, deckHeights.low, zones.blankMagazine.z] as [number, number, number],
    rot: [0, 0, Math.PI / 2] as [number, number, number],
    ...CAST,
  })),

  // Blank stacks: the magazine holds FOUR separate stacks with a >=20 mm gap
  // between them, not one continuous pile (OI 5-25 / OT p12).
  ...[0, 1, 2, 3].flatMap((stack) =>
    Array.from({ length: 5 }, (_, i) => ({
      mat: 'cartonAmber' as const,
      size: [0.62, 0.09, 1.5] as [number, number, number],
      pos: [
        zones.blankMagazine.x - 1.15 + stack * (0.62 + STACK_GAP),
        2.38 + i * 0.08,
        zones.blankMagazine.z,
      ] as [number, number, number],
      ...CAST,
    }))
  ),

  // End stop the stacks are driven against (OI 5-25 item 4)
  {
    mat: 'steelLight',
    size: [0.12, 1.1, 2.2],
    pos: [zones.blankMagazine.x + 1.55, 2.1, zones.blankMagazine.z],
    ...CAST,
  },

  // Cross transfer plate
  {
    mat: 'beltGreenDeep',
    size: [zones.crossTransfer.width, 0.12, zones.crossTransfer.depth],
    pos: [zones.crossTransfer.x, 1.08, zones.crossTransfer.z],
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
