import { memo, useMemo } from 'react';
import { Box } from '../../core/primitives';
import { MACHINE_LAYOUT_3D, getLaneZ3D } from '../../../machineLayout';

const GROUPING = MACHINE_LAYOUT_3D.zones.grouping;
const P = MACHINE_LAYOUT_3D.productSize3D;

/**
 * Products accumulating in the grouping lanes behind the product clamp
 * (OI 5-12 items 1/2).
 *
 * NOTE (Phase 6a/6d): the real lanes are blue belts in a staggered echelon, and
 * the products are tall slim 47 x 33 x 63-122 mm cartons — not cubes. Both are
 * corrected in the geometry phase; see MACHINE_REFERENCE.md.
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
  const laneZ = useMemo(() => getLaneZ3D(rowCount), [rowCount]);
  const activeLaneIndex = Math.max(0, laneFillCounts.findIndex((count) => count < colCount));

  return (
    <group>
      {laneZ.map((z, lane) => (
        <Box
          key={`lane-base-${lane}`}
          mat={lane === activeLaneIndex ? 'laneBaseActive' : 'laneBaseIdle'}
          pos={[GROUPING.x, MACHINE_LAYOUT_3D.deckHeights.high + 0.02, z]}
          size={[GROUPING.width - 0.4, 0.05, 0.78]}
          receiveShadow
        />
      ))}

      {laneFillCounts.map((count, lane) =>
        Array.from({ length: count }).map((_, slot) => (
          <Box
            key={`${lane}-${slot}`}
            mat="product"
            pos={[GROUPING.x - 2.65 + slot * 0.62, MACHINE_LAYOUT_3D.deckHeights.products, laneZ[lane]]}
            size={[P, P, P]}
            castShadow
            receiveShadow
          />
        ))
      )}

      {/* Product clamp */}
      <Box
        mat="clampBar"
        pos={[
          MACHINE_LAYOUT_3D.productPath.groupingX - 1.85,
          MACHINE_LAYOUT_3D.deckHeights.products - 0.08,
          laneZ[Math.min(activeLaneIndex, rowCount - 1)],
        ]}
        size={[0.22, 1.16, 1.48]}
        castShadow
        receiveShadow
      />
    </group>
  );
});
