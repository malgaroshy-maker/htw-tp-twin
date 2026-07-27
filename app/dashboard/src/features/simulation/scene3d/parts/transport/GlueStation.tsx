import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Box } from '../../core/primitives';
import { geometries } from '../../core/geometries';
import { materials } from '../../core/materials';
import { useMergedParts } from '../../core/useMergedParts';
import type { StaticPart } from '../../core/merge';
import { MACHINE_LAYOUT_3D, TRAY_SIZE_3D } from '../../../machineLayout';

const { deckHeights, zones } = MACHINE_LAYOUT_3D;
const [, TRAY_Z] = TRAY_SIZE_3D;

/**
 * Z of the glue line: just clear of the carton wall it applies to.
 *
 * Every Z in this file was a fixed number from before the format table pinned
 * the tray to 145 mm — heads at ±1.55 and rails at ±2.08 against a carton whose
 * walls are at ±0.56. The whole station stood about a unit outboard of the
 * carton, applying glue to open air.
 */
const GLUE_Z = TRAY_Z / 2 + 0.12;
const RAIL_Z = TRAY_Z / 2 + 0.2;
const VERTICAL_Z = TRAY_Z / 2 + 0.3;

/** [x, z] of each horizontal applicator head (OI 5-38 item 7). */
const GLUE_HEADS: [number, number][] = [
  [8.2, GLUE_Z],
  [9.6, GLUE_Z],
  [11.0, GLUE_Z],
  [8.9, -GLUE_Z],
  [10.3, -GLUE_Z],
];

/**
 * Vertical gluing heads (OT p14 item 2) — a separate set from the horizontal
 * applicators, gluing the upright plates rather than the flaps. Released by
 * their own tray sensor ("Tray sensor release crosswise gluing").
 */
const VERTICAL_GLUE_HEADS: [number, number][] = [
  [12.2, VERTICAL_Z],
  [12.2, -VERTICAL_Z],
];

/** Applicator body height, and the rail its bracket lands on. */
const HEAD_Y = deckHeights.glue + 0.42;
const RAIL_Z_ABS = TRAY_Z / 2 + 0.2;

/** Rails run the length of the transport zone, not an arbitrary 10.8. */
const RAIL_LENGTH = zones.mainTransport.width - 3.0;
const RAIL_X = zones.mainTransport.x + 1.1;

/**
 * Glue rails, closing guides and applicator nozzles.
 *
 * Kept out of the static merge because all three groups drive `emissiveIntensity`
 * from machine state. Each group owns one registry material and every mesh in
 * the group shares its state, so mutating it is safe.
 *
 * NOTE (Phase 6g): the real machine has five applicator heads plus a separate
 * set for vertical gluing (OI 5-38 item 7, OT p14 item 2). This models two.
 */
export const GlueStation = memo(function GlueStation({
  glueActive,
  guideActive,
}: {
  glueActive: boolean;
  guideActive: boolean;
}) {
  const nozzleRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const placed = useRef(false);

  // Applicator bodies never move; only the nozzle emissive changes.
  const bodies = useMergedParts('GlueStation', () => [
    ...GLUE_HEADS.map(([x, z]) => ({
      mat: 'steelDark' as const,
      size: [0.3, 0.34, 0.3] as [number, number, number],
      pos: [x, HEAD_Y, z] as [number, number, number],
      castShadow: true,
      receiveShadow: true,
    })),
    /*
     * Mounting brackets. The five applicators were drawn hanging in mid-air over
     * the transport with nothing holding them — visible as soon as the camera
     * presets were tight enough to frame the station. Each now drops onto the
     * glue rail that runs beside it.
     */
    ...GLUE_HEADS.map(([x, z]) => ({
      mat: 'steelMid' as const,
      size: [0.08, 0.08, Math.abs(z) - RAIL_Z_ABS + 0.02] as [number, number, number],
      pos: [x, HEAD_Y, (z + Math.sign(z) * RAIL_Z_ABS) / 2] as [number, number, number],
      receiveShadow: true,
    })),
    ...GLUE_HEADS.map(([x, z]) => ({
      mat: 'steelMid' as const,
      size: [0.08, HEAD_Y - deckHeights.guides, 0.08] as [number, number, number],
      pos: [x, (HEAD_Y + deckHeights.guides) / 2, Math.sign(z) * RAIL_Z_ABS] as [
        number,
        number,
        number,
      ],
      receiveShadow: true,
    })),
  ] satisfies StaticPart[]);

  useFrame(() => {
    const nozzles = nozzleRef.current;
    if (nozzles && !placed.current) {
      placed.current = true;
      GLUE_HEADS.forEach(([x, z], i) => {
        dummy.position.set(x, deckHeights.glue, z);
        dummy.scale.set(0.24, 0.55, 0.24);
        dummy.updateMatrix();
        nozzles.setMatrixAt(i, dummy.matrix);
      });
      nozzles.instanceMatrix.needsUpdate = true;
    }

    const m = materials();
    m.glueRail.emissiveIntensity = glueActive ? 0.14 : 0.04;
    m.clampBar.emissiveIntensity = guideActive ? 0.08 : 0.02;
    m.amberOn.emissiveIntensity = glueActive ? 1.4 : 0.25;
  });

  return (
    <group>
      {/* Glue guide rails */}
      {[RAIL_Z, -RAIL_Z].map((z) => (
        <Box key={`glue-rail-${z}`} mat="glueRail" pos={[RAIL_X, deckHeights.guides, z]} size={[RAIL_LENGTH, 0.14, 0.14]} castShadow receiveShadow />
      ))}

      {/* Closing guides, running along the carton wall just above the deck */}
      {[RAIL_Z, -RAIL_Z].map((z) => (
        <Box key={`closing-guide-${z}`} mat="clampBar" pos={[RAIL_X, deckHeights.products + 0.3, z]} size={[RAIL_LENGTH, 0.14, 0.14]} castShadow receiveShadow />
      ))}

      {/*
        Five applicator heads, per OI 5-38 item 7 (the figure labels 7 five
        times). Three on the near rail, two on the far one, staggered along
        travel as in the CAD detail.
      */}
      <instancedMesh
        ref={nozzleRef}
        args={[geometries().cylinder, materials().amberOn, GLUE_HEADS.length]}
        castShadow
      />
      {/* Vertical gluing heads, angled inward at the plate line */}
      {VERTICAL_GLUE_HEADS.map(([x, z], i) => (
        <group key={`v-${i}`} position={[x, deckHeights.glue - 0.3, z]} rotation={[z > 0 ? 0.5 : -0.5, 0, 0]}>
          <Box mat="amberOn" size={[0.2, 0.42, 0.2]} />
          <Box mat="steelDark" pos={[0, 0.34, 0]} size={[0.28, 0.3, 0.28]} receiveShadow />
        </group>
      ))}

      {bodies.map((g) => (
        <mesh key={g.key} geometry={g.geometry} material={materials()[g.mat]} castShadow receiveShadow />
      ))}
    </group>
  );
});
