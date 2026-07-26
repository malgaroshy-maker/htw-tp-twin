import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

import type { Group, Mesh } from 'three';
import { Box, Plane } from '../../core/primitives';
import { materials } from '../../core/materials';
import { MACHINE_LAYOUT_3D } from '../../../machineLayout';
import { lerp } from '../../core/mathUtils';
import { damp, FOLLOW_LAMBDA } from '../../../animation/constants';

/**
 * The wrap-around carton being erected around the slug while in transit.
 *
 * NOTE (Phase 6g): the real machine folds this with edge flap folders, corner
 * cover feeders, upper/lower blank guides and pressure guides, and glues it with
 * five applicator heads (OI 5-38). Panels here are scaled rather than hinged;
 * swapping the scale for real rotating folder blades is the fidelity upgrade.
 */
export const FormedCarton = memo(function FormedCarton({
  visible,
  x,
  z,
  formProgress,
  rejectActive,
}: {
  visible: boolean;
  x: number;
  z: number;
  formProgress: number;
  rejectActive: boolean;
}) {
  const groupRef = useRef<Group>(null);
  const leftWallRef = useRef<Mesh>(null);
  const rightWallRef = useRef<Mesh>(null);
  const frontFlapRef = useRef<Mesh>(null);
  const rearFlapRef = useRef<Mesh>(null);
  const topPanelRef = useRef<Mesh>(null);
  const topSealLeftRef = useRef<Mesh>(null);
  const topSealRightRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    const group = groupRef.current;
    const leftWall = leftWallRef.current;
    const rightWall = rightWallRef.current;
    const frontFlap = frontFlapRef.current;
    const rearFlap = rearFlapRef.current;
    const topPanel = topPanelRef.current;
    const sealLeft = topSealLeftRef.current;
    const sealRight = topSealRightRef.current;
    if (!group || !leftWall || !rightWall || !frontFlap || !rearFlap || !topPanel || !sealLeft || !sealRight) {
      return;
    }

    group.position.x = damp(group.position.x, x, FOLLOW_LAMBDA, delta);
    group.position.z = damp(group.position.z, z + (rejectActive ? 2.4 : 0), FOLLOW_LAMBDA * 0.8, delta);

    const sideHeight = lerp(0.01, 0.56, Math.max(0, (formProgress - 0.12) / 0.88));
    const sideInset = lerp(1.5, 1.08, formProgress);
    const flapHeight = lerp(0.01, 0.34, Math.max(0, (formProgress - 0.34) / 0.66));
    const flapInset = lerp(0.98, 0.74, Math.max(0, (formProgress - 0.34) / 0.66));
    const topLift = lerp(0.03, 0.58, Math.max(0, (formProgress - 0.58) / 0.42));
    const topWidth = lerp(0.02, 1.66, Math.max(0, (formProgress - 0.64) / 0.36));

    // The base scale carries the panel's own size (shared unit box), so the
    // fold animation multiplies rather than overwrites it.
    leftWall.scale.set(0.04, 0.58 * sideHeight, 1.74);
    rightWall.scale.set(0.04, 0.58 * sideHeight, 1.74);
    leftWall.position.set(-sideInset, 0.46 * sideHeight, 0);
    rightWall.position.set(sideInset, 0.46 * sideHeight, 0);

    frontFlap.scale.set(2.46, 0.24 * flapHeight, 0.04);
    rearFlap.scale.set(2.46, 0.24 * flapHeight, 0.04);
    frontFlap.position.set(0, 0.3 * flapHeight, flapInset);
    rearFlap.position.set(0, 0.3 * flapHeight, -flapInset);

    topPanel.scale.set(1.66 * topWidth, 0.028, 1.44);
    topPanel.position.set(0, topLift, 0);

    sealLeft.position.set(0, topLift + 0.025, 0.68);
    sealRight.position.set(0, topLift + 0.025, -0.68);

    // Both seals share one registry material — they are always in the same state.
    materials().amberOn.emissiveIntensity = Math.max(0, (formProgress - 0.78) / 0.22) * 0.6;
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} position={[x, MACHINE_LAYOUT_3D.deckHeights.products - 0.22, z]}>
      <Box mat="cartonBase" size={[2.96, 0.045, 1.88]} castShadow receiveShadow />
      <Plane mat="cartonBase" pos={[0, 0.05, 0]} size={[2.76, 1.64, 1]} receiveShadow />

      <Box ref={leftWallRef} mat="cartonBase" pos={[-1.48, 0.02, 0]} size={[0.04, 0.58, 1.74]} castShadow receiveShadow />
      <Box ref={rightWallRef} mat="cartonBase" pos={[1.48, 0.02, 0]} size={[0.04, 0.58, 1.74]} castShadow receiveShadow />

      <Box ref={frontFlapRef} mat="cartonFold" pos={[0, 0.02, 0.94]} size={[2.46, 0.24, 0.04]} castShadow receiveShadow />
      <Box ref={rearFlapRef} mat="cartonFold" pos={[0, 0.02, -0.94]} size={[2.46, 0.24, 0.04]} castShadow receiveShadow />

      <Box ref={topPanelRef} mat="cartonFold" pos={[0, 0.22, 0]} size={[1.66, 0.028, 1.44]} castShadow receiveShadow />

      {/* Glue seal strips */}
      <Box ref={topSealLeftRef} mat="amberOn" pos={[0, 0.3, 0.78]} size={[1.92, 0.02, 0.03]} castShadow receiveShadow />
      <Box ref={topSealRightRef} mat="amberOn" pos={[0, 0.3, -0.78]} size={[1.92, 0.02, 0.03]} castShadow receiveShadow />

      {/* Fold creases */}
      {[-0.72, 0.72].map((zOffset) => (
        <Box key={zOffset} mat="cartonEdge" pos={[0, 0.018, zOffset]} size={[2.58, 0.016, 0.02]} receiveShadow />
      ))}
    </group>
  );
});
