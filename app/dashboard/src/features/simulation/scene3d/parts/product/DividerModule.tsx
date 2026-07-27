import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { Box } from '../../core/primitives';
import { MACHINE_LAYOUT_3D, getLaneZ3DReal } from '../../../machineLayout';
import { damp, FOLLOW_LAMBDA } from '../../../animation/constants';
import { DIVIDER_X } from './groupingGeometry';
import { materials } from '../../core/materials';
import { useMergedParts } from '../../core/useMergedParts';

/**
 * Divider that distributes the single-lane infeed across the transport lanes
 * (OI 5-9 item 1). The separator upstream creates the gap it swings into.
 *
 * The carriage seeks the lane it is currently filling, so it must use the *same*
 * lane table as the lanes themselves (`getLaneZ3DReal`). It used to use the
 * superseded `getLaneZ3D`, whose span was four times wider, so the carriage
 * travelled to Z positions no lane occupied.
 *
 * NOTE (Phase 6d): the real unit also carries a separator, a width-adjustment
 * spindle with a hand wheel, and vertical side frames.
 */
/** Bed top sits flush with the surface product rides on. */
const BED_Y = MACHINE_LAYOUT_3D.deckHeights.products - 0.125;
export const DividerModule = memo(function DividerModule({
  currentLane,
  rowCount,
  gapClear,
}: {
  currentLane: number;
  rowCount: number;
  /** Divider may only swing when the gap sensor reports clear (OI 5-9 item 5). */
  gapClear: boolean;
}) {
  const carriageRef = useRef<Group>(null);
  const laneZ = useMemo(() => getLaneZ3DReal(rowCount), [rowCount]);

  useFrame((_, delta) => {
    if (!carriageRef.current) return;
    const targetZ = laneZ[Math.min(currentLane, rowCount - 1)] || 0;
    carriageRef.current.position.z = damp(carriageRef.current.position.z, targetZ, FOLLOW_LAMBDA * 1.4, delta);
  });

  // Everything except the lane-seeking carriage is fixed, so it is baked into
  // one buffer per material instead of ~9 separate meshes.
  const statics = useMergedParts('DividerModule', () => [
        { mat: 'frameDark', size: [2.0, 0.05, 4.2], pos: [0, 0.1, 0], receiveShadow: true },
        ...[-0.4, 0.4].map((x) => ({
          mat: 'steelMid' as const,
          shape: 'cylinder' as const,
          size: [0.1, 4.0, 0.1] as [number, number, number],
          pos: [x, 0.25, 0] as [number, number, number],
          rot: [Math.PI / 2, 0, 0] as [number, number, number],
          receiveShadow: true,
        })),
        // Separator: creates the gap the divider swings into (OI 5-9 item 3)
        { mat: 'steelLight', size: [0.5, 0.5, 3.6], pos: [-1.5, 0.3, 0], receiveShadow: true },
        { mat: 'rubberBlack', size: [0.12, 0.3, 3.4], pos: [-1.2, 0.22, 0], receiveShadow: true },
        // Width adjustment spindle and hand wheel (OI 5-10)
        {
          mat: 'steelMid', shape: 'cylinder',
          size: [0.07, 1.6, 0.07], pos: [0.4, 0.95, -2.3],
          rot: [0, 0, Math.PI / 2], receiveShadow: true,
        },
        {
          mat: 'steelDark', shape: 'cylinder',
          size: [0.42, 0.06, 0.42], pos: [-0.45, 0.95, -2.3],
          rot: [0, 0, Math.PI / 2], receiveShadow: true,
        },
      ]);
  const mats = materials();

  return (
    <group position={[DIVIDER_X, BED_Y, 0]}>
      {statics.map((g) => (
        <mesh key={g.key} geometry={g.geometry} material={mats[g.mat]} receiveShadow />
      ))}

      {/* Gap sensor — the divider may only swing when it reports clear */}
      <Box mat={gapClear ? 'sensorOn' : 'rejectBox'} pos={[-0.95, 0.64, 1.9]} size={[0.18, 0.18, 0.18]} />

      {/* Lane-seeking carriage */}
      <group ref={carriageRef}>
        <Box mat="steelLight" pos={[0, 0.35, 0]} size={[1.2, 0.15, 1.4]} receiveShadow />
        {[-0.4, 0.4].map((z) => (
          <Box key={`arm-${z}`} mat="amberStatic" pos={[1.2, 0.35, z]} size={[2.4, 0.1, 0.05]} receiveShadow />
        ))}
        <Box mat="pusherHead" pos={[-0.2, 0.55, 0]} size={[0.4, 0.3, 0.6]} receiveShadow />
      </group>
    </group>
  );
});
