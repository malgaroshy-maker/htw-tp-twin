import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { Box, Cyl } from '../../core/primitives';
import { materials } from '../../core/materials';

/**
 * Suction arm that lifts a blank out of the guide shaft (OI 5-33 item 3).
 * Vacuum is shut off at the lower end position, which the cup glow reflects.
 */
export const SuctionArm = memo(function SuctionArm({
  active,
  progress,
  z,
}: {
  active: boolean;
  progress: number;
  z: number;
}) {
  const armRef = useRef<Group>(null);

  useFrame(() => {
    if (!armRef.current) return;
    const drop = active ? Math.sin(Math.min(progress, 1) * Math.PI) * 0.9 : 0;
    armRef.current.position.y = 2.5 - drop;
    armRef.current.rotation.z = active ? -0.08 - drop * 0.05 : -0.08;
    materials().suctionCup.emissiveIntensity = active ? 0.35 : 0.1;
  });

  return (
    <group ref={armRef} position={[-5.9, 2.5, z]}>
      <Box mat="steelMid" size={[4.2, 0.16, 0.16]} castShadow receiveShadow />
      <Box mat="steelLight" pos={[1.8, -0.48, 0]} size={[0.12, 0.86, 0.12]} castShadow receiveShadow />
      {[-0.4, 0, 0.4].map((cupZ) => (
        <Cyl key={cupZ} mat="suctionCup" pos={[1.8, -0.92, cupZ]} size={[0.24, 0.16, 0.24]} castShadow receiveShadow />
      ))}
    </group>
  );
});
