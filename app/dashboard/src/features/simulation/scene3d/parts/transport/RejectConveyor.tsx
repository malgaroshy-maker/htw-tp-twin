import { memo } from 'react';
import { Html } from '@react-three/drei';
import { Box } from '../../core/primitives';
import { MACHINE_LAYOUT_3D } from '../../../machineLayout';

const REJECT = MACHINE_LAYOUT_3D.zones.rejectConveyor;

/**
 * The reject branch at the outfeed.
 *
 * NOTE (Phase 6h): the real machine discharges rejects onto a *gravity roller
 * track* standing on its own legs, not a slatted belt — see OI 5-56 in
 * `docs/3d-rebuild/media/05-56_outfeed_cad.png`. This keeps the current slat
 * geometry; the rebuild is a later phase.
 */
export const RejectConveyor = memo(function RejectConveyor({
  storedPositions,
  active,
  liveRejectActive,
  liveRejectX,
}: {
  storedPositions: number[];
  active: boolean;
  liveRejectActive: boolean;
  liveRejectX: number;
}) {
  return (
    <group>
      {/* Bed and chute */}
      <Box mat="frameDarkMatte" pos={[REJECT.x, 0.94, REJECT.z]} size={[REJECT.width, 0.12, REJECT.depth]} castShadow receiveShadow />
      <Box mat="frame" pos={[15.36, 1.0, 2.48]} rot={[0, 0, 0.24]} size={[1.55, 0.06, 0.42]} castShadow receiveShadow />
      <Box mat="frameDark" pos={[REJECT.x, 0.87, REJECT.z]} size={[REJECT.width, 0.16, 0.08]} castShadow receiveShadow />

      {/* Side rails */}
      <Box mat="coverDark" pos={[REJECT.x, 1.08, REJECT.z + 0.72]} size={[REJECT.width, 0.22, 0.06]} castShadow receiveShadow />
      <Box mat="coverDark" pos={[REJECT.x, 1.08, REJECT.z - 0.72]} size={[REJECT.width, 0.22, 0.06]} castShadow receiveShadow />
      <Box mat="coverDark" pos={[REJECT.x - 2.8, 1.08, REJECT.z]} size={[0.06, 0.22, 1.44]} castShadow receiveShadow />
      <Box mat="coverDark" pos={[REJECT.x + 2.8, 1.08, REJECT.z]} size={[0.06, 0.22, 1.44]} castShadow receiveShadow />

      {/* Slats */}
      {Array.from({ length: 6 }).map((_, index) => (
        <Box
          key={`reject-slat-${index}`}
          mat="coverDark"
          pos={[REJECT.x - 2.1 + index * 0.88, 1.0, REJECT.z]}
          size={[0.48, 0.03, 1.16]}
          castShadow
          receiveShadow
        />
      ))}

      {/* Accumulated rejects */}
      {storedPositions.map((xPosition, index) => (
        <group key={index} position={[xPosition, 1.14, REJECT.z]}>
          <Box mat={active ? 'rejectBoxDark' : 'cartonBase'} size={[1.78, 0.3, 1.06]} castShadow receiveShadow />
          <Box mat="cartonFold" pos={[0, 0.38, 0]} size={[1.54, 0.03, 0.92]} castShadow receiveShadow />
        </group>
      ))}

      {/* The one currently being diverted */}
      {liveRejectActive && (
        <group position={[liveRejectX, 1.14, REJECT.z]}>
          <Box mat="rejectBox" size={[1.78, 0.3, 1.06]} castShadow receiveShadow />
          <Box mat="rejectLid" pos={[0, 0.18, 0]} size={[1.54, 0.03, 0.92]} castShadow receiveShadow />
        </group>
      )}

      <Html position={[REJECT.x, 2.32, REJECT.z]} rotation={[-Math.PI / 2, 0, 0]} transform center scale={0.02}>
        <div
          style={{
            color: active ? '#FCA5A5' : '#94A3B8',
            fontSize: '10px',
            opacity: 0.7,
            fontWeight: 900,
            letterSpacing: '0.15em',
            whiteSpace: 'nowrap',
          }}
        >
          REJECT CONVEYOR
        </div>
      </Html>
    </group>
  );
});
