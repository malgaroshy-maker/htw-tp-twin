import { memo, useMemo } from 'react';
import { materials } from '../../core/materials';
import { mergeStaticParts } from '../../core/merge';
import type { StaticPart } from '../../core/merge';
import { MACHINE_LAYOUT_3D } from '../../../machineLayout';
import { lerp, smoothstep } from '../../core/mathUtils';

const SEGMENT_COUNT = 12;
const RAIL_Z_OFFSETS = [-0.52, 0.52];

interface Segment {
  x: number;
  y: number;
  angle: number;
  length: number;
}

/** Build the eased ramp as a chain of short angled segments. */
function buildRamp(yStart: number, yEnd: number): Segment[] {
  const { blankPath } = MACHINE_LAYOUT_3D;
  const rampStart = blankPath.rampStartX;
  const rampEnd = blankPath.transferX;

  return Array.from({ length: SEGMENT_COUNT }, (_, index) => {
    const t0 = index / SEGMENT_COUNT;
    const t1 = (index + 1) / SEGMENT_COUNT;
    const x0 = lerp(rampStart, rampEnd, t0);
    const x1 = lerp(rampStart, rampEnd, t1);
    const y0 = lerp(yStart, yEnd, smoothstep(t0));
    const y1 = lerp(yStart, yEnd, smoothstep(t1));
    const dx = x1 - x0;
    const dy = y1 - y0;
    return {
      x: (x0 + x1) / 2,
      y: (y0 + y1) / 2,
      angle: Math.atan2(dy, dx),
      length: Math.sqrt(dx * dx + dy * dy),
    };
  });
}

/**
 * Deck and guide rails carrying the blank from the low transport up to transfer
 * height. Entirely static — it never changes after mount, so it is a prime
 * candidate for geometry merging in Phase 4.
 */
/**
 * Deck and guide rails carrying the blank from the low transport up to transfer
 * height. Entirely static, so the 38 segments are merged into one buffer per
 * material rather than 38 draw calls.
 */
export const BlankLiftPath = memo(function BlankLiftPath() {
  const groups = useMemo(() => {
    const { blankPath, zones, deckHeights } = MACHINE_LAYOUT_3D;
    const rampStart = blankPath.rampStartX;
    const lowerLength = zones.blankTransport.width + (zones.blankTransport.x - rampStart);
    const lowerX = (zones.blankTransport.x + rampStart) / 2 - 1.0;

    const deckSegments = buildRamp(deckHeights.lowTransport, blankPath.transferY - 0.12);
    const railSegments = buildRamp(deckHeights.lowTransport + 0.1, blankPath.transferY + 0.02);

    const parts: StaticPart[] = [
      {
        mat: 'nearBlack',
        size: [lowerLength, 0.08, zones.blankTransport.depth],
        pos: [lowerX, deckHeights.lowTransport, zones.blankTransport.z],
        receiveShadow: true,
      },
      ...deckSegments.map((s) => ({
        mat: 'gunmetal' as const,
        size: [s.length + 0.02, 0.08, 1.2] as [number, number, number],
        pos: [s.x, s.y, blankPath.z] as [number, number, number],
        rot: [0, 0, s.angle] as [number, number, number],
        receiveShadow: true,
      })),
      ...RAIL_Z_OFFSETS.flatMap((zOffset) => [
        {
          mat: 'steelDark' as const,
          size: [lowerLength, 0.06, 0.08] as [number, number, number],
          pos: [lowerX, deckHeights.lowTransport + 0.1, zones.blankTransport.z + zOffset] as [number, number, number],
          receiveShadow: true,
        },
        ...railSegments.map((s) => ({
          mat: 'steelMid' as const,
          size: [s.length + 0.02, 0.05, 0.06] as [number, number, number],
          pos: [s.x, s.y, blankPath.z + zOffset] as [number, number, number],
          rot: [0, 0, s.angle] as [number, number, number],
          receiveShadow: true,
        })),
      ]),
    ];
    return mergeStaticParts(parts);
  }, []);

  const mats = materials();
  return (
    <group>
      {groups.map((g) => (
        <mesh key={g.key} geometry={g.geometry} material={mats[g.mat]} receiveShadow={g.receiveShadow} />
      ))}
    </group>
  );
});
