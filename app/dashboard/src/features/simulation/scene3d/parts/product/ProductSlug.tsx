import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { geometries } from '../../core/geometries';
import { materials } from '../../core/materials';
import { MACHINE_LAYOUT_3D, PRODUCT_SIZE_3D, REAL_MM, MM, getLaneZ3DReal } from '../../../machineLayout';
import { damp, FOLLOW_LAMBDA } from '../../../animation/constants';

/**
 * Upper bound on instances. The formation is 3 x 8..10 on the real machine
 * (OI 2-23), so this is generous — but it must be a *constant*: sizing the
 * InstancedMesh from `rowCount * colCount` made three.js tear down and rebuild
 * the whole instance buffer on every recipe change.
 */
const MAX_INSTANCES = 8 * 16;

/** Along-travel slot pitch, from the tray footprint in OI 2-23. */
const SLOT_PITCH = (REAL_MM.tray.length / 10) * MM;

/** The grouped product formation travelling into and through the packing section. */
export const ProductSlug = memo(function ProductSlug({
  visible,
  x,
  opacity,
  rowCount,
  colCount,
}: {
  visible: boolean;
  x: number;
  opacity: number;
  rowCount: number;
  colCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const displayX = useRef(x);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Rewriting every instance matrix per frame is wasted work when nothing about
  // the layout changed — track what the buffer was last built for.
  const lastLayout = useRef('');

  useFrame((_, delta) => {
    // `x` steps at the 500 ms poll; chase it so the slug glides.
    displayX.current = damp(displayX.current, x, FOLLOW_LAMBDA, delta);
    if (groupRef.current) groupRef.current.position.x = displayX.current;

    const mesh = meshRef.current;
    if (!mesh) return;

    materials().slugProduct.opacity = opacity;

    const count = Math.min(rowCount * colCount, MAX_INSTANCES);
    mesh.count = count;

    const key = `${rowCount}:${colCount}`;
    if (key === lastLayout.current) return;
    lastLayout.current = key;

    /*
     * The lanes and the tray share one pitch in this model — 145 mm across three
     * lanes is exactly the tray's own 3-across pitch (OI 2-23) — so the slug
     * keeps the lane spacing all the way through. It used to start 2.2x wider
     * and converge, which meant the formation visibly sprang apart the instant it
     * left the lanes and squeezed back together before the tray.
     */
    const zPositions = getLaneZ3DReal(rowCount);

    let i = 0;
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        if (i >= MAX_INSTANCES) break;
        dummy.position.set(col * SLOT_PITCH, PRODUCT_SIZE_3D[1] / 2, zPositions[row]);
        dummy.scale.set(...PRODUCT_SIZE_3D);
        dummy.updateMatrix();
        mesh.setMatrixAt(i++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!visible) return null;

  return (
    // position.x is owned by the useFrame damper above; y/z are fixed.
    <group ref={groupRef} position={[x, MACHINE_LAYOUT_3D.deckHeights.products, 0]}>
      <instancedMesh
        ref={meshRef}
        args={[geometries().box, materials().slugProduct, MAX_INSTANCES]}
        castShadow
        receiveShadow
      />
    </group>
  );
});
