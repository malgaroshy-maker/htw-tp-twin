import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Box } from '../../core/primitives';
import { geometries } from '../../core/geometries';
import { materials } from '../../core/materials';
import { useMergedParts } from '../../core/useMergedParts';
import type { StaticPart } from '../../core/merge';
import { MACHINE_LAYOUT_3D } from '../../../machineLayout';

const { deckHeights } = MACHINE_LAYOUT_3D;

/** [x, z] of each horizontal applicator head (OI 5-38 item 7). */
const GLUE_HEADS: [number, number][] = [
  [7.4, 1.55],
  [8.8, 1.55],
  [10.2, 1.55],
  [8.1, -1.55],
  [9.5, -1.55],
];

/**
 * Vertical gluing heads (OT p14 item 2) — a separate set from the horizontal
 * applicators, gluing the upright plates rather than the flaps. Released by
 * their own tray sensor ("Tray sensor release crosswise gluing").
 */
const VERTICAL_GLUE_HEADS: [number, number][] = [
  [11.4, 1.95],
  [11.4, -1.95],
];

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
  const bodies = useMergedParts('GlueStation', () =>
        GLUE_HEADS.map(([x, z]) => ({
          mat: 'steelDark' as const,
          size: [0.3, 0.34, 0.3] as [number, number, number],
          pos: [x, deckHeights.glue + 0.42, z] as [number, number, number],
          castShadow: true,
          receiveShadow: true,
        })) satisfies StaticPart[]
  );

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
      {[2.08, -2.08].map((z) => (
        <Box key={`glue-rail-${z}`} mat="glueRail" pos={[10.2, deckHeights.guides, z]} size={[10.8, 0.14, 0.14]} castShadow receiveShadow />
      ))}

      {/* Closing guides */}
      {[2.1, -2.1].map((z) => (
        <Box key={`closing-guide-${z}`} mat="clampBar" pos={[10.2, 3.32, z]} size={[10.8, 0.14, 0.14]} castShadow receiveShadow />
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
