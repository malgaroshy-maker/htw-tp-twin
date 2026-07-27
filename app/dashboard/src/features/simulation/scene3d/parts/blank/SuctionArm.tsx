import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import { Box, Cyl } from '../../core/primitives';
import { materials } from '../../core/materials';
import { SHAFT_PICK } from './shaftGeometry';

/**
 * Suction arm at the blank withdraw station (OI 5-33 item 3).
 *
 * The arm reaches the mouth of the inner blank guide shaft, grips the lowest
 * blank with its vacuum cups, and draws it **downward** out of the shaft onto
 * the blank transport — it does not scoop a blank off a pile. At the lower end
 * position the vacuum is cut and the blank is released, then the arm returns
 * empty.
 *
 * Stroke:
 *   t 0.00 - 0.50   descending, blank held, vacuum on
 *   t 0.50 - 1.00   returning to the shaft, empty, vacuum off
 */

/** Cup offset below the arm beam. */
const CUP_DROP = 0.92;
/** Where the blank is released onto the transport. */
const DEPOSIT_Y = 1.16;

const TOP_Y = SHAFT_PICK.y + CUP_DROP;
const BOTTOM_Y = DEPOSIT_Y + CUP_DROP;

export const SuctionArm = memo(function SuctionArm({
  active,
  progress,
  z,
  vacuumOk,
}: {
  active: boolean;
  progress: number;
  z: number;
  vacuumOk: boolean;
}) {
  const armRef = useRef<Group>(null);
  const heldRef = useRef<Mesh>(null);

  useFrame(() => {
    const arm = armRef.current;
    const held = heldRef.current;
    if (!arm) return;

    const t = active ? Math.max(0, Math.min(1, progress)) : 0;
    const descending = t <= 0.5;
    // Ease both strokes so the arm settles rather than slamming.
    const stroke = descending ? t / 0.5 : 1 - (t - 0.5) / 0.5;
    const eased = stroke * stroke * (3 - 2 * stroke);

    arm.position.y = TOP_Y + (BOTTOM_Y - TOP_Y) * eased;

    // Carrying only on the way down.
    if (held) held.visible = active && descending;

    materials().suctionCup.emissiveIntensity = active && vacuumOk && descending ? 0.5 : 0.08;
  });

  return (
    <group ref={armRef} position={[SHAFT_PICK.x - 1.8, TOP_Y, z]}>
      {/* Beam and vertical carrier */}
      <Box mat="steelMid" size={[4.2, 0.16, 0.16]} castShadow receiveShadow />
      <Box mat="steelLight" pos={[1.8, -0.48, 0]} size={[0.12, 0.86, 0.12]} castShadow receiveShadow />

      {/* Vacuum cups */}
      {[-0.4, 0, 0.4].map((cupZ) => (
        <Cyl
          key={cupZ}
          mat="suctionCup"
          pos={[1.8, -CUP_DROP, cupZ]}
          size={[0.24, 0.16, 0.24]}
          castShadow
          receiveShadow
        />
      ))}

      {/* The blank being drawn down out of the shaft */}
      <Box
        ref={heldRef}
        mat="boardCream"
        pos={[1.8, -CUP_DROP - 0.06, 0]}
        size={[3.1, 0.04, 2.0]}
        castShadow
        receiveShadow
      />
    </group>
  );
});
