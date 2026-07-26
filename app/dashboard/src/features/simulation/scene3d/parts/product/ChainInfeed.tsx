import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { Box, Cyl } from '../../core/primitives';
import { materials } from '../../core/materials';
import { MACHINE_LAYOUT_3D } from '../../../machineLayout';

const TRANSFER = MACHINE_LAYOUT_3D.zones.transfer;
const LUG_Z = [-1.55, -0.52, 0.52, 1.55];

/**
 * Chain infeed pusher — takes the grouped formation and drives it onto the blank.
 *
 * NOTE (Phase 6e): the real station is dominated by a large **portal arch
 * side-frame pair** carrying five pusher plates, with an alignment station and a
 * 3-D completeness camera (OI 5-18, `media/05-18_chain-infeed_cad.png`). What is
 * modelled here is a simplified deck with four lugs; the arch rebuild is a later
 * phase.
 */
export const ChainInfeed = memo(function ChainInfeed({
  active,
  progress,
  gapSensorActive,
  completenessCameraActive,
}: {
  active: boolean;
  progress: number;
  gapSensorActive: boolean;
  completenessCameraActive: boolean;
}) {
  const lugRef = useRef<Group>(null);

  useFrame(() => {
    if (!lugRef.current) return;
    const lugTravel = active ? progress * 3.3 : 0;
    lugRef.current.position.x = MACHINE_LAYOUT_3D.productPath.transferX - 2.7 + lugTravel;

    // Owned emissives — see the note on the dynamic block in materials.ts
    const m = materials();
    m.lugBody.emissiveIntensity = active ? 0.44 : 0.1;
    m.lugSensor.emissiveIntensity = active ? 0.22 : 0.04;
    m.cameraLens.emissiveIntensity = completenessCameraActive ? 0.65 : 0.12;
  });

  return (
    <group>
      <Box mat="deckGlass" pos={[TRANSFER.x - 0.15, 3.02, 0]} size={[5.25, 0.08, 4.08]} receiveShadow />

      {/* Side frames */}
      {[-1.96, 1.96].map((z) => (
        <group key={`side-frame-${z}`} position={[TRANSFER.x - 0.15, 3.76, z]}>
          <Box mat="cover" size={[5.05, 0.1, 0.08]} castShadow receiveShadow />
          <Box mat="cover" pos={[-2.35, -1.1, 0]} size={[0.1, 2.34, 0.1]} castShadow receiveShadow />
          <Box mat="cover" pos={[2.25, -1.1, 0]} size={[0.1, 2.34, 0.1]} castShadow receiveShadow />
        </group>
      ))}

      <Box mat="cover" pos={[TRANSFER.x - 2.58, 3.12, 0]} size={[0.08, 1.24, 4.0]} castShadow receiveShadow />

      {/* Upper and lower product guides */}
      {LUG_Z.map((z) => (
        <Box key={`guide-${z}`} mat="rail" pos={[TRANSFER.x + 0.1, 3.19, z]} size={[4.36, 0.05, 0.06]} castShadow receiveShadow />
      ))}
      {[-1.55, 1.55].map((z) => (
        <Box key={`lower-guide-${z}`} mat="frame" pos={[TRANSFER.x + 0.15, 3.0, z]} size={[4.3, 0.03, 0.05]} castShadow receiveShadow />
      ))}

      {/* Travelling lug carriage */}
      <group ref={lugRef} position={[MACHINE_LAYOUT_3D.productPath.transferX - 2.7, 3.24, 0]}>
        {LUG_Z.map((z, index) => (
          <group key={z} position={[0, 0, z]}>
            <Box mat="lugBody" size={[1.1, 0.22, 0.14]} castShadow receiveShadow />
            <Box mat="coverDark" pos={[-0.72, 0, 0]} size={[0.44, 0.08, 0.08]} castShadow receiveShadow />
            <Box mat="lugSensor" pos={[0.24, 0.18, 0]} size={[0.26, 0.14, 0.1]} castShadow receiveShadow />
            <Box
              mat="frame"
              pos={[index % 2 === 0 ? -1.5 : -0.8, 0, 0]}
              size={[0.92, 0.08, 0.08]}
              castShadow
              receiveShadow
            />
          </group>
        ))}
      </group>

      {/* Gap monitoring sensor (OI 5-18 item 5) */}
      <group position={[TRANSFER.x - 1.35, 3.6, 2.18]}>
        <Box mat="steelDark" size={[0.12, 0.62, 0.12]} castShadow receiveShadow />
        <Box mat={gapSensorActive ? 'sensorOn' : 'sensorOff'} pos={[0, 0.28, 0]} size={[0.44, 0.22, 0.22]} castShadow receiveShadow />
      </group>

      {/* 3-D completeness camera (OI 5-18 item 6) */}
      <group position={[TRANSFER.x + 1.88, 4.26, -2.28]}>
        <Box mat="steelLight" size={[0.48, 0.42, 0.62]} castShadow receiveShadow />
        <Cyl mat="cameraLens" pos={[0.26, -0.04, 0]} rot={[0, Math.PI / 2, 0]} size={[0.24, 0.22, 0.24]} castShadow receiveShadow />
        <Box mat="steelMid" pos={[-0.18, -0.35, 0]} size={[0.14, 0.7, 0.14]} castShadow receiveShadow />
      </group>
    </group>
  );
});
