import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { Box, Cyl } from '../../core/primitives';
import { materials } from '../../core/materials';
import { mergeStaticParts } from '../../core/merge';
import type { StaticPart } from '../../core/merge';
import { MACHINE_LAYOUT_3D } from '../../../machineLayout';

const TRANSFER = MACHINE_LAYOUT_3D.zones.transfer;

/**
 * Chain infeed pusher (OI 5-18).
 *
 * The two large rounded side frames are not decoration — they *are* the chain
 * loop path. Five pusher plates ride that loop: they drop into the gaps between
 * product rows on the lower run, push the formation onto the tray, then lift
 * away and return over the top. The gap sensor exists precisely because the
 * plates need a clear gap to lower into.
 */

/** Chain loop, in the XZ-travel / Y-height plane. */
const LOOP = {
  cx: TRANSFER.x - 0.15,
  cy: 3.95,
  halfW: 2.2,
  halfH: 0.82,
  radius: 0.62,
};
/** Pusher plates span the full lane width between the two frames. */
const BAR_HALF_Z = 1.95;
const PLATE_COUNT = 5;

/**
 * Point on the rounded-rectangle chain path for t in [0,1), running clockwise
 * from the start of the lower (working) run.
 */
function loopPoint(t: number): { x: number; y: number } {
  const { cx, cy, halfW, halfH, radius } = LOOP;
  const straightX = 2 * (halfW - radius);
  const straightY = 2 * (halfH - radius);
  const arc = (Math.PI / 2) * radius;
  const perimeter = 2 * straightX + 2 * straightY + 4 * arc;

  let d = ((t % 1) + 1) % 1 * perimeter;

  // Lower run, travelling +X (this is the stroke that pushes product)
  if (d < straightX) return { x: cx - halfW + radius + d, y: cy - halfH };
  d -= straightX;
  // Bottom-right corner
  if (d < arc) {
    const a = (d / arc) * (Math.PI / 2);
    return {
      x: cx + halfW - radius + Math.sin(a) * radius,
      y: cy - halfH + radius - Math.cos(a) * radius,
    };
  }
  d -= arc;
  // Right side, rising
  if (d < straightY) return { x: cx + halfW, y: cy - halfH + radius + d };
  d -= straightY;
  // Top-right corner
  if (d < arc) {
    const a = (d / arc) * (Math.PI / 2);
    return {
      x: cx + halfW - radius + Math.cos(a) * radius,
      y: cy + halfH - radius + Math.sin(a) * radius,
    };
  }
  d -= arc;
  // Upper return run, travelling -X
  if (d < straightX) return { x: cx + halfW - radius - d, y: cy + halfH };
  d -= straightX;
  // Top-left corner
  if (d < arc) {
    const a = (d / arc) * (Math.PI / 2);
    return {
      x: cx - halfW + radius - Math.sin(a) * radius,
      y: cy + halfH - radius + Math.cos(a) * radius,
    };
  }
  d -= arc;
  // Left side, descending
  if (d < straightY) return { x: cx - halfW, y: cy + halfH - radius - d };
  d -= straightY;
  // Bottom-left corner
  const a = (d / arc) * (Math.PI / 2);
  return {
    x: cx - halfW + radius - Math.cos(a) * radius,
    y: cy - halfH + radius - Math.sin(a) * radius,
  };
}

/** The side frames traced as short segments around the same loop. */
function buildFrame(z: number): StaticPart[] {
  const SEGMENTS = 48;
  const parts: StaticPart[] = [];
  for (let i = 0; i < SEGMENTS; i += 1) {
    const a = loopPoint(i / SEGMENTS);
    const b = loopPoint((i + 1) / SEGMENTS);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    parts.push({
      mat: 'steelLight',
      size: [len + 0.03, 0.16, 0.1],
      pos: [(a.x + b.x) / 2, (a.y + b.y) / 2, z],
      rot: [0, 0, Math.atan2(dy, dx)],
      castShadow: true,
      receiveShadow: true,
    });
  }
  return parts;
}

const STATIC_PARTS: StaticPart[] = [
  // Deck the formation slides across
  {
    mat: 'deckGlassDark',
    size: [5.25, 0.08, 4.08],
    pos: [TRANSFER.x - 0.15, 3.02, 0],
    receiveShadow: true,
  },
  // Portal frames, one each side
  ...buildFrame(-BAR_HALF_Z - 0.12),
  ...buildFrame(BAR_HALF_Z + 0.12),
  // Frame feet
  ...[-1, 1].flatMap((sign) =>
    [-2.1, 2.1].map((dx) => ({
      mat: 'steelLight' as const,
      size: [0.14, 1.0, 0.14] as [number, number, number],
      pos: [TRANSFER.x - 0.15 + dx, 3.55, sign * (BAR_HALF_Z + 0.12)] as [number, number, number],
      castShadow: true,
      receiveShadow: true,
    }))
  ),
  // Alignment-station product guides (OI 5-18 item 1)
  ...[-1.55, 1.55].map((z) => ({
    mat: 'frame' as const,
    size: [4.3, 0.03, 0.05] as [number, number, number],
    pos: [TRANSFER.x + 0.15, 3.0, z] as [number, number, number],
    castShadow: true,
    receiveShadow: true,
  })),
  // Chain-infeed product guides (item 2)
  ...[-1.55, -0.52, 0.52, 1.55].map((z) => ({
    mat: 'steelMid' as const,
    size: [4.36, 0.05, 0.06] as [number, number, number],
    pos: [TRANSFER.x + 0.1, 3.19, z] as [number, number, number],
    castShadow: true,
    receiveShadow: true,
  })),
];

export const ChainInfeed = memo(function ChainInfeed({
  active,
  progress,
  gapSensorActive,
  completenessCameraActive,
}: {
  active: boolean;
  progress: number;
  gapSensorActive: boolean;
  completenessCameraActive: boolean;
}) {
  const plateRefs = useRef<(Mesh | null)[]>([]);
  const phase = useRef(0);
  const lastProgress = useRef(0);
  const staticGroups = useMemo(() => mergeStaticParts(STATIC_PARTS), []);

  useFrame((_, delta) => {
    // One loop per transfer cycle, driven by cycle progress rather than wall
    // clock so the plates stay in step with the formation they are pushing.
    // Accumulating the delta (rather than assigning progress) keeps the motion
    // continuous across the wrap at the end of each cycle.
    if (active) {
      let step = progress - lastProgress.current;
      if (step < -0.5) step += 1; // wrapped
      if (step > 0) phase.current += step;
    } else {
      phase.current += delta * 0.04; // idle drift, so it never looks frozen
    }
    lastProgress.current = progress;

    for (let i = 0; i < PLATE_COUNT; i += 1) {
      const plate = plateRefs.current[i];
      if (!plate) continue;
      const p = loopPoint(phase.current + i / PLATE_COUNT);
      plate.position.set(p.x, p.y, 0);
    }

    const m = materials();
    m.lugBody.emissiveIntensity = active ? 0.44 : 0.1;
    m.cameraLens.emissiveIntensity = completenessCameraActive ? 0.65 : 0.12;
  });

  const mats = materials();

  return (
    <group>
      {staticGroups.map((g) => (
        <mesh
          key={g.key}
          geometry={g.geometry}
          material={mats[g.mat]}
          castShadow={g.castShadow}
          receiveShadow={g.receiveShadow}
        />
      ))}

      {/* Five pusher plates circulating on the chain loop (OI 5-18 item 3) */}
      {Array.from({ length: PLATE_COUNT }).map((_, i) => (
        <Box
          key={i}
          ref={(m: Mesh | null) => {
            plateRefs.current[i] = m;
          }}
          mat="lugBody"
          size={[0.16, 0.34, BAR_HALF_Z * 2]}
          castShadow
          receiveShadow
        />
      ))}

      {/* Gap monitoring sensor — the plates need a clear gap to lower into */}
      <group position={[TRANSFER.x - 1.35, 3.6, 2.18]}>
        <Box mat="steelDark" size={[0.12, 0.62, 0.12]} castShadow receiveShadow />
        <Box
          mat={gapSensorActive ? 'sensorOn' : 'sensorOff'}
          pos={[0, 0.28, 0]}
          size={[0.44, 0.22, 0.22]}
          castShadow
          receiveShadow
        />
      </group>

      {/* 3-D completeness camera, mounted over the loop (item 6) */}
      <group position={[TRANSFER.x + 1.0, 5.15, 0]}>
        <Box mat="steelLight" size={[0.48, 0.42, 0.62]} castShadow receiveShadow />
        <Cyl mat="cameraLens" pos={[0, -0.28, 0]} size={[0.24, 0.22, 0.24]} castShadow receiveShadow />
        <Box mat="steelMid" pos={[0, 0.34, 0]} size={[0.14, 0.5, 0.14]} castShadow receiveShadow />
      </group>
    </group>
  );
});
