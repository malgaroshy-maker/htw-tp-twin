import { memo } from 'react';
import { Html } from '@react-three/drei';
import { Box } from '../../core/primitives';

/**
 * A photo-eye on a stalk. The head swaps between two prebuilt registry
 * materials rather than allocating one per state.
 */
export const SensorPost = memo(function SensorPost({
  position,
  active,
  label,
}: {
  position: [number, number, number];
  active: boolean;
  label: string;
}) {
  return (
    <group position={position}>
      <Box mat="steelDark" size={[0.18, 1.1, 0.18]} receiveShadow />
      <Box
        mat={active ? 'sensorOn' : 'sensorOff'}
        pos={[0, 0.55, 0]}
        size={[0.45, 0.36, 0.28]}
        receiveShadow
      />
      <Html position={[0, 1.2, 0]} center scale={0.02} className="pointer-events-none whitespace-nowrap">
        <div
          style={{
            color: '#94A3B8',
            fontSize: '10px',
            opacity: 0.6,
            fontWeight: 800,
            letterSpacing: '0.1em',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
});
