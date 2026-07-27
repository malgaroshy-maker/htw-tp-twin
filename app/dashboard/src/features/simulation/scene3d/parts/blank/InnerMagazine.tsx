import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Box } from '../../core/primitives';
import { geometries } from '../../core/geometries';
import { materials } from '../../core/materials';
import { MOUTH_Y, BLANK_X, BLANK_Z, SHEET_THICKNESS, MAX_SHEETS, SHAFT_X, SHAFT_Z } from './shaftGeometry';

/**
 * Inner blank guide shaft — the "internal tray magazine".
 *
 * The cross transfer does **not** feed the suction arm directly. It fills this
 * vertical shaft, and the suction arm reaches up, grips the lowest blank and
 * draws it *downward* out of the shaft onto the blank transport below
 * (OI 5-33: "the blanks are taken from the blank guide shaft and deposited
 * before the blank transport"; vacuum is cut at the arm's lower end position).
 *
 * The stack depth is bound to `sns.blanks_remaining`, and the minimum-count
 * sensor at the base drives the refill request.
 */

export const InnerMagazine = memo(function InnerMagazine({
  blanksRemaining,
  lowLevel,
}: {
  /** 0..1 fill fraction of the shaft. */
  blanksRemaining: number;
  lowLevel: boolean;
}) {
  const stackRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lastCount = useRef(-1);

  useFrame(() => {
    const mesh = stackRef.current;
    if (!mesh) return;

    const count = Math.max(0, Math.min(MAX_SHEETS, Math.round(blanksRemaining * MAX_SHEETS)));
    mesh.count = count;

    // The stack only changes when a blank is drawn; no need to rewrite matrices
    // on every frame.
    if (count === lastCount.current) return;
    lastCount.current = count;

    for (let i = 0; i < count; i += 1) {
      dummy.position.set(0, MOUTH_Y + 0.04 + i * SHEET_THICKNESS, 0);
      dummy.scale.set(BLANK_X, SHEET_THICKNESS * 0.8, BLANK_Z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  const shaftHeight = MAX_SHEETS * SHEET_THICKNESS + 0.3;
  const shaftMidY = MOUTH_Y + shaftHeight / 2;

  return (
    <group position={[SHAFT_X, 0, SHAFT_Z]}>
      {/* Corner guide posts holding the stack square */}
      {[
        [-BLANK_X / 2, -BLANK_Z / 2],
        [BLANK_X / 2, -BLANK_Z / 2],
        [-BLANK_X / 2, BLANK_Z / 2],
        [BLANK_X / 2, BLANK_Z / 2],
      ].map(([x, z], i) => (
        <Box
          key={i}
          mat="steelLight"
          pos={[x, shaftMidY, z]}
          size={[0.09, shaftHeight, 0.09]}
          castShadow
          receiveShadow
        />
      ))}

      {/* Side retaining plates */}
      {[-BLANK_Z / 2 - 0.06, BLANK_Z / 2 + 0.06].map((z) => (
        <Box
          key={`plate-${z}`}
          mat="guardSmoke"
          pos={[0, shaftMidY, z]}
          size={[BLANK_X, shaftHeight, 0.03]}
          castShadow
        />
      ))}

      {/* Blank stack, depleting downward as the arm draws sheets out */}
      <instancedMesh
        ref={stackRef}
        args={[geometries().box, materials().boardCream, MAX_SHEETS]}
        castShadow
        receiveShadow
      />

      {/* Minimum-count sensor at the shaft mouth (OI 5-33 item 5) */}
      <Box
        mat={lowLevel ? 'rejectBox' : 'sensorOn'}
        pos={[BLANK_X / 2 + 0.16, MOUTH_Y + 0.18, 0]}
        size={[0.16, 0.18, 0.18]}
        castShadow
      />
    </group>
  );
});
