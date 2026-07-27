import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { geometries } from '../../core/geometries';
import { Box } from '../../core/primitives';
import { materials } from '../../core/materials';
import { useMergedParts } from '../../core/useMergedParts';
import type { StaticPart } from '../../core/merge';
import { MACHINE_LAYOUT_3D, TRAY_SIZE_3D } from '../../../machineLayout';

const { zones, deckHeights } = MACHINE_LAYOUT_3D;
const [TRAY_X, TRAY_Z] = TRAY_SIZE_3D;

/**
 * Outfeed and reject branch (OI 5-56).
 *
 * Three things leave the discharge end:
 *
 *   2  to further processing  the good pack carries straight on
 *   1  rejection conveyor     diverts an unsealed pack sideways
 *   3  discharge roller track a gravity roller track **at 90 degrees** to the
 *                             machine, standing on its own legs
 *
 * The track used to run parallel to the machine and sat a metre and a half below
 * the discharge deck, so it read as a detached object floating beside the
 * frame. It now branches across the machine from the discharge, stepping down
 * from deck height, which is what the figure shows.
 */

const MAX_STORED = 4;
const ROLLER_COUNT = 11;
const ROLLER_PITCH = 0.44;

/** The branch runs across the machine in +Z, starting at the discharge. */
const BRANCH_X = zones.discharge.x;
const TRACK_Z0 = TRAY_Z / 2 + 0.9;
const TRACK_LEN = ROLLER_COUNT * ROLLER_PITCH;
const TRACK_Z_MID = TRACK_Z0 + TRACK_LEN / 2;
/** Just below the deck, so a pack rolls off rather than dropping to it. */
const TRACK_Y = deckHeights.high - 0.24;
const TRACK_W = TRAY_X * 0.8;

/** Resting position of the nth accumulated reject, stacking away from the machine. */
function storedZ(index: number) {
  return TRACK_Z0 + 0.8 + index * 1.35;
}

const TRACK_PARTS: StaticPart[] = [
  // Diverter chute off the discharge, angled down into the track
  {
    mat: 'frame',
    size: [TRACK_W, 0.06, 1.3],
    pos: [BRANCH_X, deckHeights.high - 0.06, TRAY_Z / 2 + 0.35],
    rot: [-0.22, 0, 0],
    receiveShadow: true,
  },

  // Free-running gravity rollers: axis across the track, spaced along it
  ...Array.from({ length: ROLLER_COUNT }, (_, i) => ({
    mat: 'steelLight' as const,
    shape: 'cylinder' as const,
    size: [0.15, TRACK_W, 0.15] as [number, number, number],
    pos: [BRANCH_X, TRACK_Y, TRACK_Z0 + 0.25 + i * ROLLER_PITCH] as [number, number, number],
    rot: [0, 0, Math.PI / 2] as [number, number, number],
    receiveShadow: true,
  })),

  // Side rails running the length of the track
  ...[-1, 1].map((sign) => ({
    mat: 'steelDark' as const,
    size: [0.07, 0.2, TRACK_LEN] as [number, number, number],
    pos: [BRANCH_X + sign * (TRACK_W / 2 + 0.04), TRACK_Y + 0.12, TRACK_Z_MID] as [
      number,
      number,
      number,
    ],
    receiveShadow: true,
  })),

  // Its own support legs, standing on the floor (OI 5-56)
  ...[0.25, 0.75].flatMap((f) =>
    [-1, 1].map((sign) => ({
      mat: 'frame' as const,
      size: [0.1, TRACK_Y, 0.1] as [number, number, number],
      pos: [
        BRANCH_X + sign * (TRACK_W / 2 - 0.08),
        TRACK_Y / 2,
        TRACK_Z0 + TRACK_LEN * f,
      ] as [number, number, number],
      receiveShadow: true,
    }))
  ),

  // "To further processing": the good pack carries straight on (item 2)
  {
    mat: 'beltBlueDeep',
    size: [4.2, 0.05, TRAY_Z + 0.5],
    pos: [BRANCH_X + 3.0, deckHeights.high - 0.02, 0],
    receiveShadow: true,
  },
  ...[-1, 1].map((sign) => ({
    mat: 'steelDark' as const,
    size: [4.2, 0.16, 0.06] as [number, number, number],
    pos: [BRANCH_X + 3.0, deckHeights.high + 0.06, sign * (TRAY_Z / 2 + 0.28)] as [
      number,
      number,
      number,
    ],
    receiveShadow: true,
  })),
];

export const RejectConveyor = memo(function RejectConveyor({
  storedPositions,
  active,
  liveRejectActive,
  liveRejectX,
}: {
  storedPositions: number[];
  active: boolean;
  liveRejectActive: boolean;
  /** Progress 0..1 of the pack currently being diverted. */
  liveRejectX: number;
}) {
  const track = useMergedParts('RejectConveyor', () => TRACK_PARTS);
  const mats = materials();
  const storedRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lastStored = useRef('');

  useFrame(() => {
    const mesh = storedRef.current;
    if (!mesh) return;
    const key = String(storedPositions.length);
    if (key === lastStored.current) return;
    lastStored.current = key;

    const n = Math.min(storedPositions.length, MAX_STORED);
    for (let i = 0; i < n; i += 1) {
      dummy.position.set(BRANCH_X, TRACK_Y + 0.2, storedZ(i));
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(TRAY_X * 0.85, 0.3, TRAY_Z * 0.9);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {track.map((g) => (
        <mesh key={g.key} geometry={g.geometry} material={mats[g.mat]} receiveShadow />
      ))}

      {/* Safety roll at the head of the track, plus its sensor (items 6/7) */}
      <Box
        mat="rubberBlack"
        pos={[BRANCH_X, TRACK_Y + 0.22, TRACK_Z0 + 0.05]}
        size={[TRACK_W, 0.16, 0.16]}
        receiveShadow
      />
      <Box
        mat={active ? 'rejectBox' : 'sensorOn'}
        pos={[BRANCH_X + TRACK_W / 2 + 0.2, TRACK_Y + 0.4, TRACK_Z0 + 0.05]}
        size={[0.16, 0.16, 0.16]}
      />

      {/* Accumulated rejects, stacking away from the machine */}
      <instancedMesh
        ref={storedRef}
        args={[geometries().box, active ? mats.rejectBoxDark : mats.cartonBase, MAX_STORED]}
        castShadow
      />

      {/* The pack currently being diverted, travelling out along the branch */}
      {liveRejectActive && (
        <group
          position={[
            BRANCH_X,
            TRACK_Y + 0.2,
            TRAY_Z / 2 + 0.3 + liveRejectX * (TRACK_LEN * 0.55),
          ]}
        >
          <Box mat="rejectBox" size={[TRAY_X * 0.85, 0.3, TRAY_Z * 0.9]} castShadow />
          <Box mat="rejectLid" pos={[0, 0.18, 0]} size={[TRAY_X * 0.7, 0.03, TRAY_Z * 0.75]} />
        </group>
      )}
    </group>
  );
});
