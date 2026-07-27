import { memo, useMemo } from 'react';
import { MACHINE_LAYOUT_3D } from '../../../machineLayout';
import { materials } from '../../core/materials';
import { mergeStaticParts } from '../../core/merge';
import type { StaticPart } from '../../core/merge';

const { zones, deckHeights, blankPath } = MACHINE_LAYOUT_3D;
const CAST = { castShadow: true, receiveShadow: true } as const;

/**
 * Static structure of the blank magazine, cross transfer and blank withdraw.
 *
 * NOTE (Phase 6b/6c): the real magazine holds four *separate* blank stacks with
 * a >=20 mm gap, fed by a roll conveyor and a cross conveyor against a limit
 * stop, and hands off to an inner blank guide shaft — a station not modelled at
 * all here. See OI 5-25 / 5-33 in docs/3d-rebuild/media/.
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

  // Blank stack
  ...Array.from({ length: 6 }, (_, i) => ({
    mat: 'cartonAmber' as const,
    size: [2.8, 0.09, 1.5] as [number, number, number],
    pos: [zones.blankMagazine.x - 0.1 + i * 0.06, 2.38 + i * 0.08, zones.blankMagazine.z] as [number, number, number],
    ...CAST,
  })),

  // Cross transfer plate
  {
    mat: 'beltGreenDeep',
    size: [zones.crossTransfer.width, 0.12, zones.crossTransfer.depth],
    pos: [zones.crossTransfer.x, 1.08, zones.crossTransfer.z],
    ...CAST,
  },

  // Blank hold-downs, both sides (OI 5-33 item 2)
  ...[1.42, 3.0].flatMap((z) =>
    [-6.7, -5.8, -4.9].map((x) => ({
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
  const groups = useMemo(() => mergeStaticParts(PARTS), []);
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
