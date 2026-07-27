import { memo } from 'react';
import { MACHINE_LAYOUT_3D } from '../../../machineLayout';
import { materials } from '../../core/materials';
import { useMergedParts } from '../../core/useMergedParts';
import type { StaticPart } from '../../core/merge';

const { frame, zones, supports } = MACHINE_LAYOUT_3D;

const CAST: Pick<StaticPart, 'castShadow' | 'receiveShadow'> = {
  castShadow: true,
  receiveShadow: true,
};
const RECEIVE: Pick<StaticPart, 'receiveShadow'> = { receiveShadow: true };

/**
 * Every immovable part of the machine chassis, declared as data so it can be
 * baked into one merged buffer per material.
 *
 * This replaces ~60 individual meshes that each carried their own inline
 * geometry and material. It is the only change in the rebuild that actually
 * reduces draw calls — sharing geometry cuts memory, merging cuts calls.
 */
const STATIC_PARTS: StaticPart[] = [
  // Base shell
  {
    mat: 'frameDark',
    size: [frame.base.width, frame.base.height, frame.base.depth],
    pos: [frame.base.x, frame.base.y, frame.base.z],
    radius: 0.25,
    ...CAST,
  },

  // Legs
  ...supports.map((position) => ({
    mat: 'frame' as const,
    size: [0.28, 2.3, 0.28] as [number, number, number],
    pos: position as [number, number, number],
    ...CAST,
  })),

  // Longitudinal spine beams
  ...[-4.6, 0, 4.6].map((z) => ({
    mat: 'frame' as const,
    size: [31.8, 0.14, 0.18] as [number, number, number],
    pos: [1.2, 0.88, z] as [number, number, number],
    ...CAST,
  })),

  // Cross members
  ...[-16.6, -10.6, -4.6, 1.2, 7.4, 13.6].map((x) => ({
    mat: 'frameDark' as const,
    size: [0.22, 0.12, 9.4] as [number, number, number],
    pos: [x, 0.92, 0] as [number, number, number],
    ...CAST,
  })),

  // Decks
  {
    mat: 'frame',
    size: [frame.lowDeck.width, frame.lowDeck.height, frame.lowDeck.depth],
    pos: [frame.lowDeck.x, frame.lowDeck.y, frame.lowDeck.z],
    ...CAST,
  },
  {
    mat: 'frame',
    size: [frame.highGroupingDeck.width, frame.highGroupingDeck.height, frame.highGroupingDeck.depth],
    pos: [frame.highGroupingDeck.x, frame.highGroupingDeck.y, frame.highGroupingDeck.z],
    ...CAST,
  },
  {
    mat: 'steelSlate',
    size: [frame.highTransferDeck.width, frame.highTransferDeck.height, frame.highTransferDeck.depth],
    pos: [frame.highTransferDeck.x, frame.highTransferDeck.y, frame.highTransferDeck.z],
    ...CAST,
  },
  {
    mat: 'frame',
    size: [frame.highTransportDeck.width, frame.highTransportDeck.height, frame.highTransportDeck.depth],
    pos: [frame.highTransportDeck.x, frame.highTransportDeck.y, frame.highTransportDeck.z],
    ...CAST,
  },

  // Side skirts (translucent guarding)
  ...[-3.48, 3.48].map((z) => ({
    mat: 'guardSmoke' as const,
    size: [29.2, 1.96, 0.16] as [number, number, number],
    pos: [1.0, 1.86, z] as [number, number, number],
    ...CAST,
  })),

  // Zone guards
  ...[3.0, -3.0].map((z) => ({
    mat: 'steelDark' as const,
    size: [zones.grouping.width - 0.6, 0.72, 0.14] as [number, number, number],
    pos: [zones.grouping.x, 3.34, z] as [number, number, number],
    ...CAST,
  })),
  ...[2.2, -2.2].map((z) => ({
    mat: 'steelDark' as const,
    size: [zones.mainTransport.width - 2.2, 0.82, 0.14] as [number, number, number],
    pos: [zones.mainTransport.x + 1.2, 3.44, z] as [number, number, number],
    ...CAST,
  })),

  // Rounded deck pads
  {
    mat: 'deckMatte',
    size: [zones.grouping.width + 2.2, 0.24, zones.grouping.depth + 0.8],
    pos: [-8.8, 2.44, 0],
    radius: 0.15,
    ...RECEIVE,
  },
  { mat: 'deckMatte', size: [6.8, 0.24, 4.9], pos: [0.85, 2.48, 0], radius: 0.12, ...RECEIVE },
  { mat: 'deckMatte', size: [12.6, 0.24, 4.6], pos: [10.7, 2.5, 0], radius: 0.12, ...RECEIVE },
  {
    mat: 'deckMatte',
    size: [zones.blankMagazine.width + 0.4, 0.22, zones.blankMagazine.depth + 0.3],
    pos: [zones.blankMagazine.x, 0.62, zones.blankMagazine.z],
    radius: 0.15,
    ...RECEIVE,
  },
  {
    mat: 'deckGlassDark',
    size: [zones.blankTransport.width, 0.18, zones.blankTransport.depth],
    pos: [zones.blankTransport.x, 1.44, zones.blankTransport.z],
    radius: 0.12,
    ...RECEIVE,
  },
  {
    mat: 'deckDark',
    size: [zones.mainTransport.width + 0.8, 0.2, zones.mainTransport.depth + 0.7],
    pos: [zones.mainTransport.x, 2.48, 0],
    radius: 0.12,
    ...RECEIVE,
  },

  // Divider bed and transfer bed
  { mat: 'frame', size: [1.3, 0.22, 5.8], pos: [-10.8, 2.88, 0], ...CAST },
  { mat: 'frame', size: [0.28, 0.34, 4.4], pos: [1.45, 2.88, 0], ...CAST },
  ...[-1.5, 1.5].map((z) => ({
    mat: 'frameDark' as const,
    size: [4.8, 0.12, 0.3] as [number, number, number],
    pos: [1.25, 2.94, z] as [number, number, number],
    ...CAST,
  })),
  ...[-1.88, 1.88].map((z) => ({
    mat: 'frame' as const,
    size: [12.1, 0.18, 0.18] as [number, number, number],
    pos: [10.8, 3.08, z] as [number, number, number],
    ...CAST,
  })),
];

export const MachineFrame = memo(function MachineFrame() {
  // Baked once. The parts never move, so this never needs to run again.
  const groups = useMergedParts('MachineFrame', () => STATIC_PARTS);
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
