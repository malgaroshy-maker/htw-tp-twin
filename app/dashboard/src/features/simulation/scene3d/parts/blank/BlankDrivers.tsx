import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { geometries } from '../../core/geometries';
import { materials } from '../../core/materials';
import { useMergedParts } from '../../core/useMergedParts';
import type { StaticPart } from '../../core/merge';
import { MACHINE_LAYOUT_3D } from '../../../machineLayout';
import { sampleBlankPath } from '../../core/mathUtils';
import { blankDisplayX, blankInTransit } from '../../../animation/blankTracker';
import { SHAFT_X } from './shaftGeometry';

const { blankPath } = MACHINE_LAYOUT_3D;

/**
 * Blank transport drivers (OI 5-34, "Mitnehmer").
 *
 * The blank transport does not slide blanks along — a chain carries **drivers**
 * that catch each blank and push it up the lift path to the main transport. A
 * curved guide plate at the head of the run turns the blank onto the ramp.
 *
 * The drivers ride the same `sampleBlankPath` curve the blank does, so a driver
 * and the blank it is pushing cannot disagree about where the path is.
 */

const DRIVER_COUNT = 6;
/*
 * The run starts where blanks are actually put on the transport — the suction
 * arm's deposit point below the shaft — not 2.7 units upstream of it, where the
 * drivers used to spend a third of their travel carrying nothing.
 */
const RUN_START = SHAFT_X - 1.2;
const RUN_END = blankPath.transferX;
const RUN_LENGTH = RUN_END - RUN_START;
/** Trailing edge clearance: the driver catches the back of the board. */
const DRIVER_STANDOFF = 1.65;
/** Free-run speed, in run-lengths per second, when no blank is on the transport. */
const IDLE_RATE = 0.09;

/** Curved guide plate at the head of the run, traced as short segments. */
const GUIDE_PLATE: StaticPart[] = Array.from({ length: 10 }, (_, i) => {
  const t0 = i / 10;
  const t1 = (i + 1) / 10;
  const x0 = blankPath.rampStartX + (RUN_END - blankPath.rampStartX) * t0;
  const x1 = blankPath.rampStartX + (RUN_END - blankPath.rampStartX) * t1;
  const a = sampleBlankPath(x0);
  const b = sampleBlankPath(x1);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return {
    mat: 'steelLight' as const,
    size: [Math.hypot(dx, dy) + 0.03, 0.03, 0.5] as [number, number, number],
    pos: [(a.x + b.x) / 2, (a.y + b.y) / 2 + 0.34, blankPath.z - 1.15] as [number, number, number],
    rot: [0, 0, Math.atan2(dy, dx)] as [number, number, number],
    receiveShadow: true,
  };
});

export const BlankDrivers = memo(function BlankDrivers({ running }: { running: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const offset = useRef(0);
  const guide = useMergedParts('BlankDrivers', () => GUIDE_PLATE);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    if (blankInTransit()) {
      /*
       * Lock the chain so a driver sits against the trailing edge of the board.
       * Same construction as the chain infeed's plate lock: the drivers are
       * evenly spaced at 1/DRIVER_COUNT, so `wanted - i/DRIVER_COUNT` puts driver
       * `i` on target, and choosing the nearest `i` keeps the chain continuous.
       *
       * Before this the drivers ran at a fixed 0.09 per second with no relation
       * to the blank at all, so they slid straight through the board.
       */
      const wanted = (blankDisplayX() - DRIVER_STANDOFF - RUN_START) / RUN_LENGTH;
      const i = Math.round((wanted - offset.current) * DRIVER_COUNT);
      offset.current = wanted - i / DRIVER_COUNT;
    } else if (running) {
      offset.current = (offset.current + delta * IDLE_RATE) % 1;
    }

    for (let i = 0; i < DRIVER_COUNT; i += 1) {
      const t = ((offset.current + i / DRIVER_COUNT) % 1 + 1) % 1;
      const pose = sampleBlankPath(RUN_START + t * RUN_LENGTH);
      dummy.position.set(pose.x, pose.y + 0.09, blankPath.z);
      dummy.rotation.set(0, 0, pose.angle);
      dummy.scale.set(0.1, 0.16, 1.9);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  const mats = materials();

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[geometries().box, mats.chainGreenDark, DRIVER_COUNT]}
        receiveShadow
      />
      {guide.map((g) => (
        <mesh key={g.key} geometry={g.geometry} material={mats[g.mat]} receiveShadow />
      ))}
    </group>
  );
});
