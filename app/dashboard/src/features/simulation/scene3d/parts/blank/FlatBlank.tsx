import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { geometries } from '../../core/geometries';
import { materials } from '../../core/materials';
import { sampleBlankPath } from '../../core/mathUtils';
import { damp, FOLLOW_LAMBDA } from '../../../animation/constants';

const SEGMENT_COUNT = 11;
const SEGMENT_OFFSETS = Array.from({ length: SEGMENT_COUNT }, (_, i) => -1.5 + i * 0.3);
const EDGE_OFFSETS = [-0.96, 0.96];

/**
 * The flat carton blank in transit, approximated by short segments sampled along
 * the lift path so it bends over the ramp instead of clipping through it.
 *
 * `x` arrives from the 500 ms poll, so binding it straight to position made the
 * blank jump twice a second. The displayed x chases the target with a
 * frame-rate-independent damped follow, and the segment poses are re-sampled
 * per frame — a plain group translate would be wrong on the curved ramp.
 */
/**
 * The flat carton blank in transit, approximated by short segments sampled along
 * the lift path so it bends over the ramp instead of clipping through it.
 *
 * All 13 pieces are one InstancedMesh: the blank bends, so it cannot be a single
 * rigid mesh, but it also does not need 13 draw calls.
 *
 * `x` arrives from the 500 ms poll, so binding it straight to position made the
 * blank jump twice a second. The displayed x chases the target with a
 * frame-rate-independent damped follow, and the poses are re-sampled per frame.
 */
export const FlatBlank = memo(function FlatBlank({
  visible,
  x,
  z,
}: {
  visible: boolean;
  x: number;
  z: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const displayX = useRef(x);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    displayX.current = damp(displayX.current, x, FOLLOW_LAMBDA, delta);
    const cx = displayX.current;

    let i = 0;
    for (const offset of SEGMENT_OFFSETS) {
      const pose = sampleBlankPath(cx + offset);
      dummy.position.set(pose.x, pose.y, z);
      dummy.rotation.set(0, 0, pose.angle);
      dummy.scale.set(0.32, 0.035, 2);
      dummy.updateMatrix();
      mesh.setMatrixAt(i++, dummy.matrix);
    }

    const centre = sampleBlankPath(cx);
    for (const edgeOffset of EDGE_OFFSETS) {
      dummy.position.set(
        centre.x + Math.cos(centre.angle) * 0.02,
        centre.y + 0.02,
        z + edgeOffset
      );
      dummy.rotation.set(0, 0, centre.angle);
      dummy.scale.set(3.1, 0.012, 0.02);
      dummy.updateMatrix();
      mesh.setMatrixAt(i++, dummy.matrix);
    }

    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!visible) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometries().box, materials().cartonFold, SEGMENT_COUNT + EDGE_OFFSETS.length]}
      castShadow
      receiveShadow
    />
  );
});
