import { memo } from 'react';
import { Box } from '../../core/primitives';

/**
 * A photo-eye on a stalk. The head swaps between two prebuilt registry
 * materials rather than allocating one per state.
 *
 * The label is no longer rendered here: it is projected by `LabelProjector`
 * into the DOM layer outside the Canvas, so this component holds no drei
 * `<Html>` and costs no per-frame DOM write.
 */
export const SensorPost = memo(function SensorPost({
  position,
  active,
}: {
  position: [number, number, number];
  active: boolean;
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
    </group>
  );
});
