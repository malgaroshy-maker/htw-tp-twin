import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { geometries } from '../../core/geometries';

import type { Group, Mesh } from 'three';
import { Box, Plane } from '../../core/primitives';
import { materials } from '../../core/materials';
import { MACHINE_LAYOUT_3D, TRAY_SIZE_3D, PRODUCT_SIZE_3D, REAL_MM, MM } from '../../../machineLayout';
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
const [TRAY_X, TRAY_Z] = TRAY_SIZE_3D;
const SLOT_PITCH = (REAL_MM.tray.length / 10) * MM;
const LANE_PITCH = REAL_MM.lanePitch * MM;
const MAX_PRODUCTS = 8 * 16;
/** Wall height follows the product, as a wrap-around tray does. */
const WALL_H = PRODUCT_SIZE_3D[1] * 0.62;

export const FormedCarton = memo(function FormedCarton({
  visible,
  x,
  z,
  formProgress,
  rejectActive,
  rowCount,
  colCount,
}: {
  visible: boolean;
  x: number;
  z: number;
  formProgress: number;
  rejectActive: boolean;
  rowCount: number;
  colCount: number;
}) {
  const productsRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lastGrid = useRef('');
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

    const sideHeight = lerp(0.01, 1, Math.max(0, (formProgress - 0.12) / 0.88));
    const sideInset = lerp(TRAY_Z / 2 + 0.12, TRAY_Z / 2, formProgress);
    const flapHeight = lerp(0.01, 1, Math.max(0, (formProgress - 0.34) / 0.66));
    const flapInset = lerp(TRAY_X / 2 + 0.1, TRAY_X / 2, Math.max(0, (formProgress - 0.34) / 0.66));
    const topLift = lerp(0.03, WALL_H, Math.max(0, (formProgress - 0.58) / 0.42));
    const topWidth = lerp(0.02, 1, Math.max(0, (formProgress - 0.64) / 0.36));

    // The base scale carries the panel's own size (shared unit box), so the
    // fold animation multiplies rather than overwrites it.
    leftWall.scale.set(TRAY_X, WALL_H * sideHeight, 0.035);
    rightWall.scale.set(TRAY_X, WALL_H * sideHeight, 0.035);
    leftWall.position.set(0, WALL_H * sideHeight * 0.5, -sideInset);
    rightWall.position.set(0, WALL_H * sideHeight * 0.5, sideInset);

    frontFlap.scale.set(0.035, WALL_H * 0.75 * flapHeight, TRAY_Z);
    rearFlap.scale.set(0.035, WALL_H * 0.75 * flapHeight, TRAY_Z);
    frontFlap.position.set(flapInset, WALL_H * 0.75 * flapHeight * 0.5, 0);
    rearFlap.position.set(-flapInset, WALL_H * 0.75 * flapHeight * 0.5, 0);

    topPanel.scale.set(TRAY_X * topWidth, 0.028, TRAY_Z * 0.94);
    topPanel.position.set(0, topLift, 0);

    sealLeft.position.set(0, topLift + 0.025, TRAY_Z / 2 - 0.04);
    sealRight.position.set(0, topLift + 0.025, -TRAY_Z / 2 + 0.04);

    // The formation stays inside the tray. Previously the slug faded to zero and
    // the carton was an empty box, so the products vanished at the exact moment
    // the tray wrapped around them — the opposite of what the machine does.
    const products = productsRef.current;
    if (products) {
      const grid = `${rowCount}:${colCount}`;
      if (grid !== lastGrid.current) {
        lastGrid.current = grid;
        let i = 0;
        const xSpan = (colCount - 1) * SLOT_PITCH;
        const zSpan = (rowCount - 1) * LANE_PITCH;
        for (let row = 0; row < rowCount; row += 1) {
          for (let col = 0; col < colCount && i < MAX_PRODUCTS; col += 1) {
            dummy.position.set(
              -xSpan / 2 + col * SLOT_PITCH,
              PRODUCT_SIZE_3D[1] / 2 + 0.03,
              -zSpan / 2 + row * LANE_PITCH
            );
            dummy.scale.set(...PRODUCT_SIZE_3D);
            dummy.updateMatrix();
            products.setMatrixAt(i, dummy.matrix);
            i += 1;
          }
        }
        products.count = i;
        products.instanceMatrix.needsUpdate = true;
      }
    }

    // Both seals share one registry material — they are always in the same state.
    materials().amberOn.emissiveIntensity = Math.max(0, (formProgress - 0.78) / 0.22) * 0.6;
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} position={[x, MACHINE_LAYOUT_3D.deckHeights.products - 0.22, z]}>
      <Box mat="cartonBase" size={[TRAY_X, 0.045, TRAY_Z]} castShadow receiveShadow />

      {/* The product formation the tray is being wrapped around */}
      <instancedMesh
        ref={productsRef}
        args={[geometries().box, materials().product, MAX_PRODUCTS]}
        castShadow
      />
      <Plane mat="cartonBase" pos={[0, 0.05, 0]} size={[TRAY_X * 0.94, TRAY_Z * 0.94, 1]} receiveShadow />

      <Box ref={leftWallRef} mat="cartonBase" pos={[0, 0.02, -TRAY_Z / 2]} size={[TRAY_X, WALL_H, 0.035]} castShadow receiveShadow />
      <Box ref={rightWallRef} mat="cartonBase" pos={[0, 0.02, TRAY_Z / 2]} size={[TRAY_X, WALL_H, 0.035]} castShadow receiveShadow />

      <Box ref={frontFlapRef} mat="cartonFold" pos={[TRAY_X / 2, 0.02, 0]} size={[0.035, WALL_H * 0.75, TRAY_Z]} castShadow receiveShadow />
      <Box ref={rearFlapRef} mat="cartonFold" pos={[-TRAY_X / 2, 0.02, 0]} size={[0.035, WALL_H * 0.75, TRAY_Z]} castShadow receiveShadow />

      <Box ref={topPanelRef} mat="cartonFold" pos={[0, WALL_H, 0]} size={[TRAY_X, 0.028, TRAY_Z * 0.94]} castShadow receiveShadow />

      {/* Glue seal strips */}
      <Box ref={topSealLeftRef} mat="amberOn" pos={[0, WALL_H, TRAY_Z / 2 - 0.04]} size={[TRAY_X * 0.96, 0.02, 0.03]} castShadow receiveShadow />
      <Box ref={topSealRightRef} mat="amberOn" pos={[0, WALL_H, -TRAY_Z / 2 + 0.04]} size={[TRAY_X * 0.96, 0.02, 0.03]} castShadow receiveShadow />

      {/* Fold creases */}
      {[-TRAY_Z / 2 + 0.06, TRAY_Z / 2 - 0.06].map((zOffset) => (
        <Box key={zOffset} mat="cartonEdge" pos={[0, 0.018, zOffset]} size={[TRAY_X * 0.9, 0.016, 0.02]} receiveShadow />
      ))}
    </group>
  );
});
