import { memo, useMemo } from 'react';
import { MACHINE_LAYOUT_3D } from '../../../machineLayout';
import { materials } from '../../core/materials';
import { mergeStaticParts } from '../../core/merge';
import type { StaticPart } from '../../core/merge';

const { zones } = MACHINE_LAYOUT_3D;
const CAST = { castShadow: true, receiveShadow: true } as const;

/**
 * Static structure of the main transport: belt surface, slats, entry guide
 * plates and the fold-guide uprights.
 *
 * NOTE (Phase 6g): the real machine runs *two* transport chains, upper and
 * lower, with the upper one height-adjustable, plus edge flap folders, a corner
 * cover feeder and five glue applicator heads (OI 5-38). This is a single belt.
 */
const PARTS: StaticPart[] = [
  // Belt surface and slats
  { mat: 'beltBlueDeep', size: [12.3, 0.035, 2.86], pos: [10.35, 3.0, 0], receiveShadow: true },
  ...Array.from({ length: 8 }, (_, i) => ({
    mat: 'beltBlue' as const,
    size: [0.82, 0.012, 2.7] as [number, number, number],
    pos: [5.6 + i * 1.46, 3.03, 0] as [number, number, number],
    receiveShadow: true,
  })),

  // Entry guide plates
  ...[-3.3, -2.9].map((dx) => ({
    mat: 'steelLight' as const,
    size: [0.08, 0.92, 6.6] as [number, number, number],
    pos: [zones.mainTransport.x + dx, 2.78, 0] as [number, number, number],
    ...CAST,
  })),

  // Fold-guide uprights
  ...[
    { z: 2.34, rot: -0.45 },
    { z: -2.34, rot: 0.45 },
  ].map(({ z, rot }) => ({
    mat: 'beltGreen' as const,
    size: [0.18, 1.1, 0.18] as [number, number, number],
    pos: [11.2, 3.06, z] as [number, number, number],
    rot: [0, 0, rot] as [number, number, number],
    ...CAST,
  })),
];

export const TransportBed = memo(function TransportBed() {
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
