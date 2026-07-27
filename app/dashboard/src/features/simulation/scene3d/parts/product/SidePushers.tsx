import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import { Box } from '../../core/primitives';
import { materials } from '../../core/materials';
import { MACHINE_LAYOUT_3D, TRAY_SIZE_3D, PRODUCT_SIZE_3D } from '../../../machineLayout';
import { lerp } from '../../core/mathUtils';
import { damp, FOLLOW_LAMBDA } from '../../../animation/constants';

const { deckHeights, productPath } = MACHINE_LAYOUT_3D;
const [, TRAY_Z] = TRAY_SIZE_3D;

/**
 * The two lateral guides that close in on the slug as it transfers (OI 5-38
 * item 2).
 *
 * Two things were wrong here:
 *
 * - **They never touched the product.** Closed, they stopped at z = ±1.25 while
 *   the formation is only ±0.56 wide, so the guides squeezed a unit and a half of
 *   empty air on each side. Both end positions now come from the tray footprint.
 * - **They stepped.** `progress` arrives from the 500 ms poll and was applied
 *   straight to `position` during render, so the guides jumped twice a second
 *   while every other moving part glided. The pose is now damped in `useFrame`,
 *   like the slug they are closing on.
 */
const GUIDE_X = productPath.transferX - 1.1;
const GUIDE_Y = deckHeights.products + PRODUCT_SIZE_3D[1] / 2;
/** Clear of the widest formation when open; just off the tray edge when closed. */
const OPEN_Z = TRAY_Z / 2 + 1.3;
const CLOSED_Z = TRAY_Z / 2 + 0.09;
const OPEN_LEN = 1.3;
const CLOSED_LEN = 2.5;

export const SidePushers = memo(function SidePushers({ progress }: { progress: number }) {
  const upperRef = useRef<Group>(null);
  const lowerRef = useRef<Group>(null);
  const upperBeam = useRef<Mesh>(null);
  const lowerBeam = useRef<Mesh>(null);
  const upperHead = useRef<Mesh>(null);
  const lowerHead = useRef<Mesh>(null);
  const shown = useRef(0);

  useFrame((_, delta) => {
    const target = Math.max(0, Math.min(1, progress));
    shown.current = damp(shown.current, target, FOLLOW_LAMBDA, delta);
    const t = shown.current;

    const z = lerp(OPEN_Z, CLOSED_Z, t);
    const beamLength = lerp(OPEN_LEN, CLOSED_LEN, t);

    if (upperRef.current) upperRef.current.position.z = z;
    if (lowerRef.current) lowerRef.current.position.z = -z;

    // The beam extends as the guide reaches in, so the head stays at its tip.
    for (const beam of [upperBeam.current, lowerBeam.current]) {
      if (beam) beam.scale.x = beamLength;
    }
    for (const head of [upperHead.current, lowerHead.current]) {
      if (head) head.position.x = beamLength / 2 - 0.14;
    }

    const glow = 0.06 + t * 0.24;
    const m = materials();
    m.pusherBeam.emissiveIntensity = glow;
    m.pusherHead.emissiveIntensity = glow * 0.9;
  });

  return (
    <group>
      {/* Fixed uprights the guides slide on */}
      {[-1, 1].map((sign) => (
        <Box
          key={sign}
          mat="steelLight"
          pos={[GUIDE_X, GUIDE_Y, sign * (OPEN_Z + 0.35)]}
          size={[0.12, 1.24, 0.12]}
          receiveShadow
        />
      ))}

      {[
        { group: upperRef, beam: upperBeam, head: upperHead, sign: 1 },
        { group: lowerRef, beam: lowerBeam, head: lowerHead, sign: -1 },
      ].map(({ group, beam, head, sign }) => (
        <group key={sign} ref={group} position={[GUIDE_X, GUIDE_Y, sign * OPEN_Z]}>
          <Box ref={beam} mat="pusherBeam" size={[1, 0.12, 0.12]} receiveShadow />
          <Box ref={head} mat="pusherHead" pos={[0, -0.05, 0]} size={[0.28, 0.28, 0.18]} receiveShadow />
        </group>
      ))}
    </group>
  );
});
