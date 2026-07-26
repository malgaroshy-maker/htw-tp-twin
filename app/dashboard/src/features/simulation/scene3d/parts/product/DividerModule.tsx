import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { Box, Cyl } from '../../core/primitives';
import { getLaneZ3D } from '../../../machineLayout';
import { damp, FOLLOW_LAMBDA } from '../../../animation/constants';

/**
 * Divider that distributes the single-lane infeed across the transport lanes
 * (OI 5-9 item 1). The separator upstream creates the gap it swings into.
 *
 * NOTE (Phase 6d): the real unit also carries a separator, a width-adjustment
 * spindle with a hand wheel, and vertical side frames.
 */
export const DividerModule = memo(function DividerModule({
  currentLane,
  rowCount,
}: {
  currentLane: number;
  rowCount: number;
}) {
  const carriageRef = useRef<Group>(null);
  const laneZ = useMemo(() => getLaneZ3D(rowCount), [rowCount]);

  useFrame((_, delta) => {
    if (!carriageRef.current) return;
    const targetZ = laneZ[Math.min(currentLane, rowCount - 1)] || 0;
    carriageRef.current.position.z = damp(carriageRef.current.position.z, targetZ, FOLLOW_LAMBDA * 1.4, delta);
  });

  return (
    <group position={[-10.55, 3.22, 0]}>
      <Box mat="frameDark" pos={[0, 0.1, 0]} size={[2.0, 0.05, 4.2]} castShadow receiveShadow />

      {/* Guide rails */}
      {[-0.4, 0.4].map((x) => (
        <Cyl key={`rail-${x}`} mat="rail" pos={[x, 0.25, 0]} rot={[Math.PI / 2, 0, 0]} size={[0.1, 4.0, 0.1]} castShadow receiveShadow />
      ))}

      {/* Lane-seeking carriage */}
      <group ref={carriageRef}>
        <Box mat="cover" pos={[0, 0.35, 0]} size={[1.2, 0.15, 1.4]} castShadow receiveShadow />
        {[-0.4, 0.4].map((z) => (
          <Box key={`arm-${z}`} mat="amberOn" pos={[1.2, 0.35, z]} size={[2.4, 0.1, 0.05]} castShadow receiveShadow />
        ))}
        <Box mat="pusherHead" pos={[-0.2, 0.55, 0]} size={[0.4, 0.3, 0.6]} castShadow receiveShadow />
        <Box mat="sensorOn" pos={[-0.2, 0.75, 0]} size={[0.2, 0.1, 0.2]} castShadow receiveShadow />
      </group>
    </group>
  );
});
