import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { Box, Cyl } from '../../core/primitives';
import { TRAY_SIZE_3D } from '../../../machineLayout';
import { STOPPER_X, TERMINAL_X, BLADE_UP, BLADE_DOWN } from './groupingGeometry';
import { damp, FOLLOW_LAMBDA } from '../../../animation/constants';

const [, TRAY_Z] = TRAY_SIZE_3D;

/**
 * Chain stopper and terminal (OT p10 items 1/2, OI 5-12 items 5/2).
 *
 * Products run down the transport lanes until they meet the **closed stopper**.
 * To hand a formation to the chain infeed the sequence is: close the terminal
 * behind the formation, then open the stopper — so what passes downstream is
 * exactly the products held between the two blades.
 *
 * Both blades are driven directly by their sensor tags rather than by cycle
 * phase, so the 3D view shows the real interlock state.
 */


/** Blade dimensions, and the cylinder that drives it. */
const BLADE_H = 0.55;
const CYLINDER_Y = BLADE_UP + 0.62;
const CYLINDER_H = 0.42;
/** Rod runs from the bottom of the cylinder body down to the top of the blade. */
const ROD_TOP = CYLINDER_Y - CYLINDER_H / 2;

/**
 * One gate: cylinder body, extending rod, and the blade the rod carries.
 *
 * The blade used to hang in mid-air on nothing. A pneumatic gate reads as a gate
 * because you can see the actuator driving it, and the rod's visible extension is
 * what makes the stroke legible at the overview camera where the blade itself is
 * only a few pixels tall.
 */
function Gate({ x, closed }: { x: number; closed: boolean }) {
  const bladeRef = useRef<Mesh>(null);
  const rodRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    const blade = bladeRef.current;
    if (!blade) return;

    const target = closed ? BLADE_DOWN : BLADE_UP;
    blade.position.y = damp(blade.position.y, target, FOLLOW_LAMBDA * 2, delta);

    // The rod spans whatever gap the blade has opened up beneath the cylinder,
    // so extension is derived from the blade rather than animated separately.
    const rod = rodRef.current;
    if (rod) {
      const bladeTop = blade.position.y + BLADE_H / 2;
      const length = Math.max(0.02, ROD_TOP - bladeTop);
      rod.scale.y = length;
      rod.position.y = bladeTop + length / 2;
    }
  });

  return (
    <group>
      {/* Overhead carrier beam and its two uprights */}
      <Box mat="steelLight" pos={[x, CYLINDER_Y + 0.42, 0]} size={[0.12, 0.12, TRAY_Z + 0.9]} receiveShadow />
      {[-1, 1].map((sign) => (
        <Box
          key={sign}
          mat="steelLight"
          pos={[x, BLADE_UP + 0.4, sign * (TRAY_Z / 2 + 0.45)]}
          size={[0.1, 1.3, 0.1]}
          receiveShadow
        />
      ))}

      {/* Cylinder body */}
      <Cyl mat="steelDark" pos={[x, CYLINDER_Y, 0]} size={[0.16, CYLINDER_H, 0.16]} castShadow receiveShadow />

      {/* Rod, extending as the blade drops */}
      <Cyl ref={rodRef} mat="steelLight" pos={[x, ROD_TOP, 0]} size={[0.06, 1, 0.06]} />

      {/* Blade */}
      <Box
        ref={bladeRef}
        mat={closed ? 'pusherHead' : 'steelLight'}
        pos={[x, BLADE_UP, 0]}
        size={[0.07, BLADE_H, TRAY_Z + 0.1]}
        castShadow
        receiveShadow
      />

      {/* Status LED */}
      <Box
        mat={closed ? 'ledGreenOn' : 'sensorOff'}
        pos={[x, CYLINDER_Y + 0.24, TRAY_Z / 2 + 0.45]}
        size={[0.14, 0.14, 0.14]}
      />
    </group>
  );
}

export const StopperTerminal = memo(function StopperTerminal({
  stopperClosed,
  terminalClosed,
}: {
  stopperClosed: boolean;
  terminalClosed: boolean;
}) {
  return (
    <group>
      <Gate x={STOPPER_X} closed={stopperClosed} />
      <Gate x={TERMINAL_X} closed={terminalClosed} />
    </group>
  );
});
