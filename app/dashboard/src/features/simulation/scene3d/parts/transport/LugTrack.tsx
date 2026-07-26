import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { Box } from '../../core/primitives';
import { MACHINE_LAYOUT_3D } from '../../../machineLayout';

const LUG_COUNT = 12;
const LUG_PITCH = 2.4;

/**
 * Scrolling flight bars on the main transport.
 *
 * NOTE (Phase 6g): the real machine has *two* chains — upper and lower — and the
 * upper one is height-adjustable (OI 5-38 items 3/4 plus the upper/lower chain
 * proximity switches in the sensor list). This models a single lower run.
 */
export const LugTrack = memo(function LugTrack({ active }: { active: boolean }) {
  const trackRef = useRef<Group>(null);
  const offsetRef = useRef(0);

  useFrame((_, delta) => {
    if (!trackRef.current) return;
    if (active) {
      offsetRef.current = (offsetRef.current + delta * 2.8) % LUG_PITCH;
    }
    trackRef.current.position.x = offsetRef.current;
  });

  return (
    <group ref={trackRef}>
      {Array.from({ length: LUG_COUNT }).map((_, index) => {
        const x = MACHINE_LAYOUT_3D.zones.mainTransport.x - 4.8 + index * LUG_PITCH;
        return (
          <group key={index} position={[x, MACHINE_LAYOUT_3D.deckHeights.products + 0.07, 0]}>
            <Box mat="steelSlate" size={[0.18, 0.55, 1.5]} castShadow receiveShadow />
            <Box mat="steelDark" pos={[0.5, 0, 0]} size={[0.95, 0.12, 1.4]} castShadow receiveShadow />
          </group>
        );
      })}
    </group>
  );
});
