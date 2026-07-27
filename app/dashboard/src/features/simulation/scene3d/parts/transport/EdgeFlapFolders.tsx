import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Group } from 'three';
import { materials } from '../../core/materials';
import { MACHINE_LAYOUT_3D } from '../../../machineLayout';
import { TRAY_SIZE_3D } from '../../../machineLayout';

const { deckHeights } = MACHINE_LAYOUT_3D;
const [, TRAY_Z] = TRAY_SIZE_3D;

/**
 * Edge flap folders (OI 5-38 item 3, OT p14 item 5).
 *
 * Curved hook-shaped blades, one each side, that sweep in behind the tray in
 * the machine direction and fold the trailing corner flaps against the carton
 * before the pressure guides close it. The real machine has a reference
 * proximity switch on each -- the sensor list names "eadgeflap folder right"
 * and "left" separately -- which is why they are modelled as two independent
 * actuators rather than a mirrored pair.
 *
 * The blade is a torus arc so the fold reads as a sweep rather than a scale.
 */

const FOLDER_X = 12.4;
const BLADE_RADIUS = 0.42;
const OPEN_ANGLE = 0;
const CLOSED_ANGLE = -0.7;

export const EdgeFlapFolders = memo(function EdgeFlapFolders({
  formProgress,
  active,
}: {
  formProgress: number;
  active: boolean;
}) {
  const leftRef = useRef<Group>(null);
  const rightRef = useRef<Group>(null);

  // One arc geometry, shared by both blades.
  const bladeGeometry = useMemo(
    () => new THREE.TorusGeometry(BLADE_RADIUS, 0.05, 8, 16, Math.PI * 0.62),
    []
  );

  useFrame(() => {
    // The folders act late in the fold, after the side walls are up.
    const t = active ? Math.max(0, Math.min(1, (formProgress - 0.55) / 0.35)) : 0;
    const eased = t * t * (3 - 2 * t);
    const angle = OPEN_ANGLE + (CLOSED_ANGLE - OPEN_ANGLE) * eased;

    if (leftRef.current) leftRef.current.rotation.x = -angle;
    if (rightRef.current) rightRef.current.rotation.x = angle;
  });

  const mats = materials();

  return (
    <group position={[FOLDER_X, deckHeights.products + 0.1, 0]}>
      {[
        { ref: leftRef, z: -TRAY_Z / 2 - 0.08, spin: 0 },
        { ref: rightRef, z: TRAY_Z / 2 + 0.08, spin: Math.PI },
      ].map(({ ref, z, spin }, i) => (
        <group key={i} position={[0, 0, z]} rotation={[0, spin, 0]}>
          {/* Pivot housing */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.09, 0.09, 0.26, 12]} />
            <primitive object={mats.steelDark} attach="material" />
          </mesh>
          {/* Sweeping blade */}
          <group ref={ref}>
            <mesh
              geometry={bladeGeometry}
              material={mats.rubberBlack}
              rotation={[0, Math.PI / 2, Math.PI * 0.2]}
              position={[0, 0, 0]}
              castShadow
            />
          </group>
        </group>
      ))}
    </group>
  );
});
