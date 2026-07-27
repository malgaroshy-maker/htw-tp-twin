import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Box } from '../../core/primitives';
import { geometries } from '../../core/geometries';
import { materials } from '../../core/materials';
import { MACHINE_LAYOUT_3D, getLaneZ3DReal, PRODUCT_SIZE_3D } from '../../../machineLayout';
import { slotX, LANE_ENTRY_X, TERMINAL_X, STOPPER_X } from './groupingGeometry';
import { damp, FOLLOW_LAMBDA } from '../../../animation/constants';

const GROUPING = MACHINE_LAYOUT_3D.zones.grouping;

/** Fixed upper bound so the instance buffer is never rebuilt on a recipe change. */
const MAX_PRODUCTS = 8 * 16;

/** Lane belt thickness. Slightly narrower than the lane pitch so belts don't merge. */
const LANE_BELT_T = 0.05;

/**
 * Products accumulating in the grouping lanes behind the product clamp
 * (OI 5-12 items 1/2).
 *
 * Two things make this read like the real machine rather than a counter:
 *
 * - Products queue **against the stopper** and stack upstream behind it, so a
 *   filling lane grows away from the blade. They used to be laid out forwards
 *   from a fixed upstream origin, which left a gap in front of the stopper.
 * - A newly divided product **slides in** from the lane entry rather than
 *   appearing at its slot, so the lane visibly fills.
 *
 * NOTE (Phase 6d): the real lanes are blue belts in a staggered echelon; these
 * are still parallel.
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

  /** Live X of every product, keyed `lane:slot`, so arrivals can be eased in. */
  const positions = useRef<Map<string, number>>(new Map());

  const laneZ = useMemo(() => getLaneZ3DReal(rowCount), [rowCount]);
  const activeLaneIndex = Math.max(0, laneFillCounts.findIndex((count) => count < colCount));

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const live = positions.current;
    const seen = new Set<string>();
    let i = 0;

    for (let lane = 0; lane < laneFillCounts.length && lane < laneZ.length; lane += 1) {
      for (let slot = 0; slot < laneFillCounts[lane] && i < MAX_PRODUCTS; slot += 1) {
        const key = `${lane}:${slot}`;
        seen.add(key);

        const target = slotX(slot);
        // A product that was not here last frame has just been divided into the
        // lane, so it starts at the entry and eases down to its resting slot.
        let x = live.get(key) ?? LANE_ENTRY_X;
        x = damp(x, target, FOLLOW_LAMBDA * 0.8, delta);
        live.set(key, x);

        dummy.position.set(x, MACHINE_LAYOUT_3D.deckHeights.products + PRODUCT_SIZE_3D[1] / 2, laneZ[lane]);
        dummy.scale.set(...PRODUCT_SIZE_3D);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        i += 1;
      }
    }

    // Forget products that have been released downstream, so the next lane fill
    // starts them from the entry again rather than from a stale position.
    if (live.size !== seen.size) {
      for (const key of live.keys()) {
        if (!seen.has(key)) live.delete(key);
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
          // Belt top flush with the surface product stands on. It was pinned to
          // `deckHeights.high`, 0.37 below `deckHeights.products` — so every
          // product in the lanes floated a third of its own height above its belt.
          pos={[GROUPING.x, MACHINE_LAYOUT_3D.deckHeights.products - LANE_BELT_T / 2, z]}
          size={[GROUPING.width - 0.4, LANE_BELT_T, PRODUCT_SIZE_3D[2] * 1.02]}
          receiveShadow
        />
      ))}

      {/*
        Lane-filling control sensors (OI 5-12 item 3) — one per lane, over the
        stopper end where a full lane registers. The grouping unit had no visible
        sensing at all, which is most of why it read as three bare belts rather
        than a controlled station.
      */}
      {laneZ.map((z, lane) => (
        <Box
          key={`lane-sensor-${lane}`}
          mat={laneFillCounts[lane] >= colCount ? 'ledGreenOn' : 'sensorOff'}
          pos={[STOPPER_X - 0.9, MACHINE_LAYOUT_3D.deckHeights.products + PRODUCT_SIZE_3D[1] + 0.16, z]}
          size={[0.12, 0.12, 0.12]}
        />
      ))}

      <instancedMesh
        ref={meshRef}
        args={[geometries().box, materials().product, MAX_PRODUCTS]}
        castShadow
      />

      {/*
        Product clamp (OI 5-12 item 2): holds the incoming stream back in the lane
        it is filling, so it belongs just upstream of the formation being built —
        not at the lane entry, where it was, nine units away from any product.
        It is also one lane wide; it used to be 1.48 deep, spanning all three.
      */}
      <Box
        mat="clampBar"
        pos={[
          TERMINAL_X - 0.5,
          MACHINE_LAYOUT_3D.deckHeights.products + PRODUCT_SIZE_3D[1] / 2,
          laneZ[Math.min(activeLaneIndex, rowCount - 1)],
        ]}
        size={[0.22, PRODUCT_SIZE_3D[1] * 1.05, PRODUCT_SIZE_3D[2] * 1.1]}
        castShadow
      />
    </group>
  );
});
