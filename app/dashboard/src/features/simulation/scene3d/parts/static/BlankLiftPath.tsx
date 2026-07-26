import { memo, useMemo } from 'react';
import { Box } from '../../core/primitives';
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
export const BlankLiftPath = memo(function BlankLiftPath() {
  const { blankPath, zones, deckHeights } = MACHINE_LAYOUT_3D;
  const rampStart = blankPath.rampStartX;

  const lowerLength = zones.blankTransport.width + (zones.blankTransport.x - rampStart);
  const lowerX = (zones.blankTransport.x + rampStart) / 2 - 1.0;

  const deckSegments = useMemo(
    () => buildRamp(deckHeights.lowTransport, blankPath.transferY - 0.12),
    [deckHeights.lowTransport, blankPath.transferY]
  );
  const railSegments = useMemo(
    () => buildRamp(deckHeights.lowTransport + 0.1, blankPath.transferY + 0.02),
    [deckHeights.lowTransport, blankPath.transferY]
  );

  return (
    <group>
      {/* Lower horizontal deck */}
      <Box
        mat="nearBlack"
        pos={[lowerX, deckHeights.lowTransport, zones.blankTransport.z]}
        size={[lowerLength, 0.08, zones.blankTransport.depth]}
        receiveShadow
      />

      {/* Ramp deck */}
      {deckSegments.map((s, index) => (
        <Box
          key={index}
          mat="gunmetal"
          pos={[s.x, s.y, blankPath.z]}
          rot={[0, 0, s.angle]}
          size={[s.length + 0.02, 0.08, 1.2]}
          receiveShadow
        />
      ))}

      {/* Guide rails, both sides */}
      {RAIL_Z_OFFSETS.map((zOffset) => (
        <group key={zOffset}>
          <Box
            mat="steelDark"
            pos={[lowerX, deckHeights.lowTransport + 0.1, zones.blankTransport.z + zOffset]}
            size={[lowerLength, 0.06, 0.08]}
            receiveShadow
          />
          {railSegments.map((s, index) => (
            <Box
              key={`${zOffset}-${index}`}
              mat="steelMid"
              pos={[s.x, s.y, blankPath.z + zOffset]}
              rot={[0, 0, s.angle]}
              size={[s.length + 0.02, 0.05, 0.06]}
              receiveShadow
            />
          ))}
        </group>
      ))}
    </group>
  );
});
