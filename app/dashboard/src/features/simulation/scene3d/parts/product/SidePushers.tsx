import { memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '../../core/primitives';
import { materials } from '../../core/materials';
import { MACHINE_LAYOUT_3D } from '../../../machineLayout';
import { lerp } from '../../core/mathUtils';

/** The two lateral guides that close in on the slug as it transfers (OI 5-38 item 2). */
export const SidePushers = memo(function SidePushers({ progress }: { progress: number }) {
  const compact = Math.max(0, Math.min(1, progress));
  const x = MACHINE_LAYOUT_3D.productPath.transferX - 1.1;
  const upperZ = lerp(2.65, 1.25, compact);
  const lowerZ = lerp(-2.65, -1.25, compact);
  const beamLength = lerp(1.3, 2.5, compact);

  useFrame(() => {
    const glow = 0.06 + compact * 0.24;
    const m = materials();
    m.pusherBeam.emissiveIntensity = glow;
    m.pusherHead.emissiveIntensity = glow * 0.9;
  });

  return (
    <group>
      <Box mat="cover" pos={[x, 3.28, 2.9]} size={[0.12, 1.24, 0.12]} castShadow receiveShadow />
      <Box mat="cover" pos={[x, 3.28, -2.9]} size={[0.12, 1.24, 0.12]} castShadow receiveShadow />

      {[upperZ, lowerZ].map((z, i) => (
        <group key={i} position={[x, 3.28, z]}>
          <Box mat="pusherBeam" size={[beamLength, 0.12, 0.12]} castShadow receiveShadow />
          <Box mat="pusherHead" pos={[beamLength / 2 - 0.14, -0.05, 0]} size={[0.28, 0.28, 0.18]} castShadow receiveShadow />
        </group>
      ))}
    </group>
  );
});
