import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { materials } from '../../core/materials';
import { useMergedParts } from '../../core/useMergedParts';
import type { StaticPart } from '../../core/merge';
import { MACHINE_LAYOUT_3D, TRAY_SIZE_3D, PRODUCT_SIZE_3D } from '../../../machineLayout';

const { zones, deckHeights } = MACHINE_LAYOUT_3D;
const [, TRAY_Z] = TRAY_SIZE_3D;

/**
 * Upper and lower transport chains (OI 5-38 items 3/4, OT p14 items 3/4).
 *
 * The machine runs *two* chains, not one belt. The lower chain carries the tray
 * and formation; the upper chain runs above it and presses the top panel down
 * as the carton closes. The upper chain is height-adjustable — the sensor list
 * has "High Adjustment limit sensors upper transport chain" reporting its
 * highest and lowest positions — so its height follows the product here.
 *
 * Each chain is a run of carriers on a shared merged geometry, translated as a
 * whole and wrapped, rather than one mesh per carrier.
 */

const CARRIER_COUNT = 10;
const CARRIER_PITCH = 1.7;
const RUN_X0 = zones.mainTransport.x - 5.6;

const LOWER_Y = deckHeights.products - 0.16;
/** Upper chain sits just above the closed carton. */
const UPPER_Y = deckHeights.products + PRODUCT_SIZE_3D[1] * 0.62 + 0.22;

function buildCarriers(mat: 'chainGreen' | 'chainGreenDark'): StaticPart[] {
  return Array.from({ length: CARRIER_COUNT }, (_, i) => ({
    mat,
    size: [0.22, 0.16, TRAY_Z + 0.5] as [number, number, number],
    pos: [RUN_X0 + i * CARRIER_PITCH, 0, 0] as [number, number, number],
    castShadow: true,
    receiveShadow: true,
  }));
}

/** Continuous chain strands either side of the carriers. */
function buildStrands(mat: 'chainGreen' | 'chainGreenDark'): StaticPart[] {
  const length = CARRIER_COUNT * CARRIER_PITCH;
  return [-1, 1].map((sign) => ({
    mat,
    size: [length, 0.07, 0.09] as [number, number, number],
    pos: [RUN_X0 + length / 2 - CARRIER_PITCH / 2, 0, sign * (TRAY_Z / 2 + 0.22)] as [
      number,
      number,
      number,
    ],
    castShadow: true,
    receiveShadow: true,
  }));
}

export const TransportChains = memo(function TransportChains({
  running,
  productHeight,
}: {
  running: boolean;
  /** 0 when no carton is present, 1 when a formed carton is under the chain. */
  productHeight: number;
}) {
  const lowerRef = useRef<Group>(null);
  const upperRef = useRef<Group>(null);
  const offset = useRef(0);

  const lower = useMergedParts('TransportChains.lower', () => [
    ...buildCarriers('chainGreen'),
    ...buildStrands('chainGreenDark'),
  ]);
  const upper = useMergedParts('TransportChains.upper', () => [
    ...buildCarriers('chainGreenDark'),
    ...buildStrands('chainGreen'),
  ]);

  useFrame((_, delta) => {
    if (running) offset.current = (offset.current + delta * 1.6) % CARRIER_PITCH;
    if (lowerRef.current) lowerRef.current.position.x = offset.current;
    if (upperRef.current) {
      upperRef.current.position.x = -offset.current;
      // Height adjustment: the upper chain lifts clear when nothing is under it.
      const target = UPPER_Y + (1 - productHeight) * 0.35;
      upperRef.current.position.y += (target - upperRef.current.position.y) * 0.08;
    }
  });

  const mats = materials();

  return (
    <>
      <group ref={lowerRef} position={[0, LOWER_Y, 0]}>
        {lower.map((g) => (
          <mesh key={g.key} geometry={g.geometry} material={mats[g.mat]} castShadow receiveShadow />
        ))}
      </group>
      <group ref={upperRef} position={[0, UPPER_Y, 0]}>
        {upper.map((g) => (
          <mesh key={g.key} geometry={g.geometry} material={mats[g.mat]} castShadow receiveShadow />
        ))}
      </group>
    </>
  );
});
