import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Box } from '../../core/primitives';
import { geometries } from '../../core/geometries';
import { materials } from '../../core/materials';
import { MACHINE_LAYOUT_3D, getLaneZ3DReal, PRODUCT_SIZE_3D, REAL_MM, MM } from '../../../machineLayout';

const GROUPING = MACHINE_LAYOUT_3D.zones.grouping;
/** Along-travel pitch: product depth plus the gap implied by the format table. */
const SLOT_PITCH = (REAL_MM.tray.length / 10) * MM;

/** Fixed upper bound so the instance buffer is never rebuilt on a recipe change. */
const MAX_PRODUCTS = 8 * 16;

/**
 * Products accumulating in the grouping lanes behind the product clamp
 * (OI 5-12 items 1/2).
 *
 * The accumulated products are one InstancedMesh rather than one mesh each. At
 * 3 x 10 that is ~30 draw calls saved, and in this scene draw calls track mesh
 * count 1:1.
 *
 * NOTE (Phase 6d): the real lanes are blue belts in a staggered echelon; these
 * are still parallel. See MACHINE_REFERENCE.md.
 */
export const GroupedLaneFill = memo(function GroupedLaneFill({
  laneFillCounts,
  rowCount,
  colCount,
}: {
  laneFillCounts: number[];
  rowCount: number;
  colCount: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lastKey = useRef('');

  const laneZ = useMemo(() => getLaneZ3DReal(rowCount), [rowCount]);
  const activeLaneIndex = Math.max(0, laneFillCounts.findIndex((count) => count < colCount));

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Lane fills are integer counts — only rebuild when one actually changes.
    const key = `${laneFillCounts.join(',')}|${rowCount}`;
    if (key === lastKey.current) return;
    lastKey.current = key;

    let i = 0;
    for (let lane = 0; lane < laneFillCounts.length && lane < laneZ.length; lane += 1) {
      for (let slot = 0; slot < laneFillCounts[lane] && i < MAX_PRODUCTS; slot += 1) {
        dummy.position.set(
          GROUPING.x - 2.65 + slot * SLOT_PITCH,
          MACHINE_LAYOUT_3D.deckHeights.products + PRODUCT_SIZE_3D[1] / 2,
          laneZ[lane]
        );
        dummy.scale.set(...PRODUCT_SIZE_3D);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        i += 1;
      }
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {laneZ.map((z, lane) => (
        <Box
          key={`lane-base-${lane}`}
          mat={lane === activeLaneIndex ? 'laneBaseActive' : 'laneBaseIdle'}
          pos={[GROUPING.x, MACHINE_LAYOUT_3D.deckHeights.high + 0.02, z]}
          size={[GROUPING.width - 0.4, 0.05, PRODUCT_SIZE_3D[2] * 1.1]}
          receiveShadow
        />
      ))}

      <instancedMesh
        ref={meshRef}
        args={[geometries().box, materials().product, MAX_PRODUCTS]}
        castShadow
      />

      {/* Product clamp */}
      <Box
        mat="clampBar"
        pos={[
          MACHINE_LAYOUT_3D.productPath.groupingX - 1.85,
          MACHINE_LAYOUT_3D.deckHeights.products - 0.08,
          laneZ[Math.min(activeLaneIndex, rowCount - 1)],
        ]}
        size={[0.22, PRODUCT_SIZE_3D[1] * 1.2, 1.48]}
        castShadow
      />
    </group>
  );
});
