import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { geometries } from '../../core/geometries';
import { Html } from '@react-three/drei';
import { Box } from '../../core/primitives';
import { materials } from '../../core/materials';
import { mergeStaticParts } from '../../core/merge';
import type { StaticPart } from '../../core/merge';
import { MACHINE_LAYOUT_3D } from '../../../machineLayout';

const REJECT = MACHINE_LAYOUT_3D.zones.rejectConveyor;

/**
 * The reject branch at the outfeed.
 *
 * Rejects leave on a **gravity roller track** standing on its own legs, branching
 * off the outfeed (OI 5-56 items 1/3). The safety roll and its sensor sit at the
 * head of the track; the max-jam sensor watches the accumulation.
 */

const MAX_STORED = 4;
const ROLLER_COUNT = 12;
const ROLLER_PITCH = 0.46;

/** Track bed, rollers, side rails and support legs — none of it moves. */
const TRACK_PARTS: StaticPart[] = [
  // Chute off the outfeed
  {
    mat: 'frame',
    size: [1.55, 0.06, 0.42],
    pos: [15.36, 1.0, 2.48],
    rot: [0, 0, 0.24],
    castShadow: true,
    receiveShadow: true,
  },
  // Free-running gravity rollers
  ...Array.from({ length: ROLLER_COUNT }, (_, i) => ({
    mat: 'steelLight' as const,
    shape: 'cylinder' as const,
    size: [0.16, REJECT.depth - 0.1, 0.16] as [number, number, number],
    pos: [REJECT.x - 2.5 + i * ROLLER_PITCH, 0.98, REJECT.z] as [number, number, number],
    rot: [Math.PI / 2, 0, 0] as [number, number, number],
    castShadow: true,
    receiveShadow: true,
  })),
  // Side rails
  ...[-1, 1].map((sign) => ({
    mat: 'steelDark' as const,
    size: [REJECT.width, 0.2, 0.07] as [number, number, number],
    pos: [REJECT.x, 1.06, REJECT.z + sign * (REJECT.depth / 2 + 0.04)] as [number, number, number],
    castShadow: true,
    receiveShadow: true,
  })),
  // Its own support legs with levelling feet (OI 5-56)
  ...[-2.3, 0.2, 2.6].flatMap((dx) =>
    [-1, 1].map((sign) => ({
      mat: 'frame' as const,
      size: [0.1, 0.92, 0.1] as [number, number, number],
      pos: [REJECT.x + dx, 0.48, REJECT.z + sign * (REJECT.depth / 2 - 0.05)] as [
        number,
        number,
        number,
      ],
      castShadow: true,
      receiveShadow: true,
    }))
  ),
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
  liveRejectX: number;
}) {
  const track = useMemo(() => mergeStaticParts(TRACK_PARTS), []);
  const mats = materials();
  const storedRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lastStored = useRef('');

  useFrame(() => {
    const mesh = storedRef.current;
    if (!mesh) return;
    const key = storedPositions.join(',');
    if (key === lastStored.current) return;
    lastStored.current = key;

    storedPositions.slice(0, MAX_STORED).forEach((x, i) => {
      dummy.position.set(x, 1.14, REJECT.z);
      dummy.scale.set(1.78, 0.3, 1.06);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.count = Math.min(storedPositions.length, MAX_STORED);
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {track.map((g) => (
        <mesh
          key={g.key}
          geometry={g.geometry}
          material={mats[g.mat]}
          castShadow={g.castShadow}
          receiveShadow={g.receiveShadow}
        />
      ))}

      {/* Safety roll at the head of the track, plus its sensor (OI 5-56 items 6/7) */}
      <Box mat="rubberBlack" pos={[REJECT.x - 3.0, 1.12, REJECT.z]} size={[0.16, 0.28, REJECT.depth]} castShadow receiveShadow />
      <Box mat={active ? 'rejectBox' : 'sensorOn'} pos={[REJECT.x - 3.0, 1.42, REJECT.z + 0.6]} size={[0.16, 0.16, 0.16]} castShadow />

      {/* Accumulated rejects, instanced -- up to three boxes of two meshes each */}
      <instancedMesh
        ref={storedRef}
        args={[geometries().box, active ? mats.rejectBoxDark : mats.cartonBase, MAX_STORED]}
        castShadow
      />

      {/* The one currently being diverted */}
      {liveRejectActive && (
        <group position={[liveRejectX, 1.14, REJECT.z]}>
          <Box mat="rejectBox" size={[1.78, 0.3, 1.06]} castShadow receiveShadow />
          <Box mat="rejectLid" pos={[0, 0.18, 0]} size={[1.54, 0.03, 0.92]} castShadow receiveShadow />
        </group>
      )}

      <Html position={[REJECT.x, 2.32, REJECT.z]} rotation={[-Math.PI / 2, 0, 0]} transform center scale={0.02}>
        <div
          style={{
            color: active ? '#FCA5A5' : '#94A3B8',
            fontSize: '10px',
            opacity: 0.7,
            fontWeight: 900,
            letterSpacing: '0.15em',
            whiteSpace: 'nowrap',
          }}
        >
          REJECT CONVEYOR
        </div>
      </Html>
    </group>
  );
});
