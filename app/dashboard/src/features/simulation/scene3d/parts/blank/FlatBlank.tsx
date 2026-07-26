import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { Box } from '../../core/primitives';
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
export const FlatBlank = memo(function FlatBlank({
  visible,
  x,
  z,
}: {
  visible: boolean;
  x: number;
  z: number;
}) {
  const segmentRefs = useRef<(Mesh | null)[]>([]);
  const edgeRefs = useRef<(Mesh | null)[]>([]);
  const displayX = useRef(x);

  useFrame((_, delta) => {
    displayX.current = damp(displayX.current, x, FOLLOW_LAMBDA, delta);
    const cx = displayX.current;

    for (let i = 0; i < SEGMENT_OFFSETS.length; i += 1) {
      const mesh = segmentRefs.current[i];
      if (!mesh) continue;
      const pose = sampleBlankPath(cx + SEGMENT_OFFSETS[i]);
      mesh.position.set(pose.x, pose.y, z);
      mesh.rotation.z = pose.angle;
    }

    const centre = sampleBlankPath(cx);
    for (let i = 0; i < EDGE_OFFSETS.length; i += 1) {
      const mesh = edgeRefs.current[i];
      if (!mesh) continue;
      mesh.position.set(
        centre.x + Math.cos(centre.angle) * 0.02,
        centre.y + 0.02,
        z + EDGE_OFFSETS[i]
      );
      mesh.rotation.z = centre.angle;
    }
  });

  if (!visible) return null;

  return (
    <group>
      {SEGMENT_OFFSETS.map((offset, i) => (
        <Box
          key={offset}
          ref={(m: Mesh | null) => {
            segmentRefs.current[i] = m;
          }}
          mat="cartonFold"
          size={[0.32, 0.035, 2]}
          castShadow
          receiveShadow
        />
      ))}
      {EDGE_OFFSETS.map((edgeOffset, i) => (
        <Box
          key={edgeOffset}
          ref={(m: Mesh | null) => {
            edgeRefs.current[i] = m;
          }}
          mat="cartonDeep"
          size={[3.1, 0.012, 0.02]}
          receiveShadow
        />
      ))}
    </group>
  );
});
