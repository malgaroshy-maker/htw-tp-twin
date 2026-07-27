import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { materials } from '../../core/materials';
import { mergeStaticParts } from '../../core/merge';
import type { StaticPart } from '../../core/merge';
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

  // The bars never move relative to each other -- only the whole track scrolls.
  // Merging them means one draw call per material instead of 24 meshes.
  const groups = useMemo(() => {
    const parts: StaticPart[] = Array.from({ length: LUG_COUNT }).flatMap((_, index) => {
      const x = MACHINE_LAYOUT_3D.zones.mainTransport.x - 4.8 + index * LUG_PITCH;
      const y = MACHINE_LAYOUT_3D.deckHeights.products + 0.07;
      return [
        { mat: 'steelSlate' as const, size: [0.18, 0.55, 1.5] as [number, number, number], pos: [x, y, 0] as [number, number, number], castShadow: true, receiveShadow: true },
        { mat: 'steelDark' as const, size: [0.95, 0.12, 1.4] as [number, number, number], pos: [x + 0.5, y, 0] as [number, number, number], castShadow: true, receiveShadow: true },
      ];
    });
    return mergeStaticParts(parts);
  }, []);

  const mats = materials();

  return (
    <group ref={trackRef}>
      {groups.map((g) => (
        <mesh key={g.key} geometry={g.geometry} material={mats[g.mat]} castShadow={g.castShadow} receiveShadow={g.receiveShadow} />
      ))}
    </group>
  );
});
