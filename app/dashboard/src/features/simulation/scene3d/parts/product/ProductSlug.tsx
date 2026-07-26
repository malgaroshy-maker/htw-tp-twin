import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { geometries } from '../../core/geometries';
import { materials } from '../../core/materials';
import { MACHINE_LAYOUT_3D } from '../../../machineLayout';
import { lerp } from '../../core/mathUtils';
import { damp, FOLLOW_LAMBDA } from '../../../animation/constants';

/**
 * Upper bound on instances. The formation is 3 x 8..10 on the real machine
 * (OI 2-23), so this is generous — but it must be a *constant*: sizing the
 * InstancedMesh from `rowCount * colCount` made three.js tear down and rebuild
 * the whole instance buffer on every recipe change.
 */
const MAX_INSTANCES = 8 * 16;

/** The grouped product formation travelling into and through the packing section. */
export const ProductSlug = memo(function ProductSlug({
  visible,
  x,
  opacity,
  rowCount,
  colCount,
  compression,
  productScale,
}: {
  visible: boolean;
  x: number;
  opacity: number;
  rowCount: number;
  colCount: number;
  compression: number;
  productScale: number;
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

    const key = `${rowCount}:${colCount}:${compression.toFixed(3)}:${productScale.toFixed(3)}`;
    if (key === lastLayout.current) return;
    lastLayout.current = key;

    const rowSpacing = lerp(2.15, 0.95, compression);
    const zPositions = Array.from({ length: rowCount }, (_, lane) =>
      lerp(-rowSpacing, rowSpacing, rowCount === 1 ? 0.5 : lane / (rowCount - 1))
    );

    let i = 0;
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        if (i >= MAX_INSTANCES) break;
        dummy.position.set(col * 0.54, 0, zPositions[row]);
        dummy.scale.setScalar(productScale);
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
