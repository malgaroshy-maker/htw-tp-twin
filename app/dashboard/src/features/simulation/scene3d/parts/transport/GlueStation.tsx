import { memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cyl } from '../../core/primitives';
import { materials } from '../../core/materials';
import { MACHINE_LAYOUT_3D } from '../../../machineLayout';

const { deckHeights } = MACHINE_LAYOUT_3D;

/**
 * Glue rails, closing guides and applicator nozzles.
 *
 * Kept out of the static merge because all three groups drive `emissiveIntensity`
 * from machine state. Each group owns one registry material and every mesh in
 * the group shares its state, so mutating it is safe.
 *
 * NOTE (Phase 6g): the real machine has five applicator heads plus a separate
 * set for vertical gluing (OI 5-38 item 7, OT p14 item 2). This models two.
 */
export const GlueStation = memo(function GlueStation({
  glueActive,
  guideActive,
}: {
  glueActive: boolean;
  guideActive: boolean;
}) {
  useFrame(() => {
    const m = materials();
    m.glueRail.emissiveIntensity = glueActive ? 0.14 : 0.04;
    m.clampBar.emissiveIntensity = guideActive ? 0.08 : 0.02;
    m.amberOn.emissiveIntensity = glueActive ? 1.4 : 0.25;
  });

  return (
    <group>
      {/* Glue guide rails */}
      {[2.08, -2.08].map((z) => (
        <Box key={`glue-rail-${z}`} mat="glueRail" pos={[10.2, deckHeights.guides, z]} size={[10.8, 0.14, 0.14]} castShadow receiveShadow />
      ))}

      {/* Closing guides */}
      {[2.1, -2.1].map((z) => (
        <Box key={`closing-guide-${z}`} mat="clampBar" pos={[10.2, 3.32, z]} size={[10.8, 0.14, 0.14]} castShadow receiveShadow />
      ))}

      {/* Applicator nozzles */}
      <group position={[8.8, deckHeights.glue, 0]}>
        {[-1, 1].map((sign) => (
          <Cyl key={sign} mat="amberOn" pos={[0, 0, sign * 1.55]} size={[0.24, 0.55, 0.24]} castShadow receiveShadow />
        ))}
      </group>
    </group>
  );
});
