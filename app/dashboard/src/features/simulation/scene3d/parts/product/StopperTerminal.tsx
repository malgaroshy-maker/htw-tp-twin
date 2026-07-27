import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { Box } from '../../core/primitives';
import { MACHINE_LAYOUT_3D, TRAY_SIZE_3D } from '../../../machineLayout';
import { damp, FOLLOW_LAMBDA } from '../../../animation/constants';

const { zones, deckHeights } = MACHINE_LAYOUT_3D;
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

/** Stopper sits at the downstream end of the lanes. */
const STOPPER_X = zones.grouping.x + zones.grouping.width / 2 - 0.35;
/** Terminal sits one formation length upstream. */
const TERMINAL_X = STOPPER_X - TRAY_SIZE_3D[0] - 0.2;

const BLADE_UP = deckHeights.products + 0.62;
const BLADE_DOWN = deckHeights.products + 0.02;

export const StopperTerminal = memo(function StopperTerminal({
  stopperClosed,
  terminalClosed,
}: {
  stopperClosed: boolean;
  terminalClosed: boolean;
}) {
  const stopperRef = useRef<Mesh>(null);
  const terminalRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (stopperRef.current) {
      const target = stopperClosed ? BLADE_DOWN : BLADE_UP;
      stopperRef.current.position.y = damp(
        stopperRef.current.position.y,
        target,
        FOLLOW_LAMBDA * 2,
        delta
      );
    }
    if (terminalRef.current) {
      const target = terminalClosed ? BLADE_DOWN : BLADE_UP;
      terminalRef.current.position.y = damp(
        terminalRef.current.position.y,
        target,
        FOLLOW_LAMBDA * 2,
        delta
      );
    }
  });

  return (
    <group>
      {/* Overhead carrier beams the blades hang from */}
      {[STOPPER_X, TERMINAL_X].map((x) => (
        <group key={x}>
          <Box mat="cover" pos={[x, BLADE_UP + 0.5, 0]} size={[0.12, 0.12, TRAY_Z + 0.9]} castShadow receiveShadow />
          {[-1, 1].map((sign) => (
            <Box
              key={sign}
              mat="cover"
              pos={[x, BLADE_UP + 0.16, sign * (TRAY_Z / 2 + 0.45)]}
              size={[0.1, 0.8, 0.1]}
              castShadow
              receiveShadow
            />
          ))}
        </group>
      ))}

      {/* Stopper blade */}
      <Box
        ref={stopperRef}
        mat={stopperClosed ? 'pusherHead' : 'steelLight'}
        pos={[STOPPER_X, BLADE_UP, 0]}
        size={[0.07, 0.55, TRAY_Z + 0.1]}
        castShadow
        receiveShadow
      />

      {/* Terminal blade */}
      <Box
        ref={terminalRef}
        mat={terminalClosed ? 'pusherHead' : 'steelLight'}
        pos={[TERMINAL_X, BLADE_UP, 0]}
        size={[0.07, 0.55, TRAY_Z + 0.1]}
        castShadow
        receiveShadow
      />

      {/* Status LEDs */}
      <Box
        mat={stopperClosed ? 'ledGreenOn' : 'sensorOff'}
        pos={[STOPPER_X, BLADE_UP + 0.72, TRAY_Z / 2 + 0.45]}
        size={[0.14, 0.14, 0.14]}
        castShadow
      />
      <Box
        mat={terminalClosed ? 'ledGreenOn' : 'sensorOff'}
        pos={[TERMINAL_X, BLADE_UP + 0.72, TRAY_Z / 2 + 0.45]}
        size={[0.14, 0.14, 0.14]}
        castShadow
      />
    </group>
  );
});
