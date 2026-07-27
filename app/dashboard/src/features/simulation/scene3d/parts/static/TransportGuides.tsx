import { memo, useMemo } from 'react';
import { materials } from '../../core/materials';
import { mergeStaticParts } from '../../core/merge';
import type { StaticPart } from '../../core/merge';
import { MACHINE_LAYOUT_3D, TRAY_SIZE_3D, PRODUCT_SIZE_3D } from '../../../machineLayout';

const { zones, deckHeights } = MACHINE_LAYOUT_3D;
const [, TRAY_Z] = TRAY_SIZE_3D;
const CARTON_TOP = deckHeights.products + PRODUCT_SIZE_3D[1] * 0.62;

/**
 * The guides that shape the carton along the main transport (OI 5-38).
 *
 *   4  upper blank guides    hold the side plates up as the carton advances
 *   5  lower blank guides    support them from beneath
 *   8  lower pressure guides a row of rollers that press the glued flaps in
 *   9  upper pressure guides a bar that closes the top panel
 *  --  corner cover feeder   lays the trailing corner plates before gluing
 *
 * All fixed structure, so it is one merged buffer per material.
 */
const PARTS: StaticPart[] = [
  // Upper blank guides — item 4
  ...[-1, 1].map((sign) => ({
    mat: 'steelLight' as const,
    size: [9.2, 0.09, 0.09] as [number, number, number],
    pos: [zones.mainTransport.x, CARTON_TOP + 0.18, sign * (TRAY_Z / 2 + 0.16)] as [
      number,
      number,
      number,
    ],
    receiveShadow: true,
  })),

  // Lower blank guides — item 5
  ...[-1, 1].map((sign) => ({
    mat: 'steelMid' as const,
    size: [9.2, 0.07, 0.07] as [number, number, number],
    pos: [zones.mainTransport.x, deckHeights.products - 0.1, sign * (TRAY_Z / 2 + 0.2)] as [
      number,
      number,
      number,
    ],
    receiveShadow: true,
  })),

  // Lower pressure guides — item 8, a row of rollers pressing the flaps in
  ...[-1, 1].flatMap((sign) =>
    Array.from({ length: 5 }, (_, i) => ({
      mat: 'steelDark' as const,
      shape: 'cylinder' as const,
      size: [0.2, 0.12, 0.2] as [number, number, number],
      pos: [zones.mainTransport.x + 1.4 + i * 0.85, deckHeights.products + 0.08, sign * (TRAY_Z / 2 + 0.13)] as [
        number,
        number,
        number,
      ],
      rot: [Math.PI / 2, 0, 0] as [number, number, number],
      receiveShadow: true,
    }))
  ),

  // Upper pressure guide — item 9
  {
    mat: 'steelLight',
    size: [7.4, 0.1, TRAY_Z * 0.7],
    pos: [zones.mainTransport.x + 1.8, CARTON_TOP + 0.1, 0],
    receiveShadow: true,
  },

  // Corner cover feeder: magazine plus plunger, laying the trailing corner
  // plates before the glue heads (OI 5-37 text, OT p14).
  {
    mat: 'steelLight',
    size: [0.7, 0.9, 1.1],
    pos: [zones.mainTransport.x - 4.4, CARTON_TOP + 0.62, TRAY_Z / 2 + 0.75],
    receiveShadow: true,
  },
  {
    mat: 'boardCream',
    size: [0.5, 0.5, 0.85],
    pos: [zones.mainTransport.x - 4.4, CARTON_TOP + 0.62, TRAY_Z / 2 + 0.75],
    receiveShadow: true,
  },
  {
    mat: 'steelDark',
    size: [0.14, 0.72, 0.14],
    pos: [zones.mainTransport.x - 4.4, CARTON_TOP + 0.14, TRAY_Z / 2 + 0.75],
    receiveShadow: true,
  },
];

export const TransportGuides = memo(function TransportGuides() {
  const groups = useMemo(() => mergeStaticParts(PARTS), []);
  const mats = materials();

  return (
    <group>
      {groups.map((g) => (
        <mesh key={g.key} geometry={g.geometry} material={mats[g.mat]} receiveShadow />
      ))}
    </group>
  );
});
