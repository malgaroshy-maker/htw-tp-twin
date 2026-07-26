import { memo } from 'react';
import { Box } from '../../core/primitives';

/** One of the nine floor-standing legs under the machine frame. Static. */
export const MachineSupport = memo(function MachineSupport({
  position,
  height,
}: {
  position: [number, number, number];
  height: number;
}) {
  return <Box mat="frame" pos={position} size={[0.28, height, 0.28]} castShadow receiveShadow />;
});
