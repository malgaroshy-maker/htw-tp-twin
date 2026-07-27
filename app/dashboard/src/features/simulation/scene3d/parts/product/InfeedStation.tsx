import { memo } from 'react';
import { Box } from '../../core/primitives';
import { materials } from '../../core/materials';
import { useMergedParts } from '../../core/useMergedParts';
import type { StaticPart } from '../../core/merge';
import { MACHINE_LAYOUT_3D, PRODUCT_SIZE_3D } from '../../../machineLayout';
import { DIVIDER_ENTRY_X } from './groupingGeometry';

const { productPath, deckHeights } = MACHINE_LAYOUT_3D;

/**
 * Feeding and blast station — the head of the machine (OI 5-7 and 5-5).
 *
 * Products arrive single-file on the infeed belt. The transfer sensor starts
 * the belt, product accumulates to the "min. jam" sensor so the following
 * station always receives a full row, and a pair of fall-over stop sensors
 * halts the feed if a product topples (lower covered while upper is not).
 *
 * Upstream of that sits the blast station: sensors identify wrongly-oriented
 * product and a jet blows it off the line, fed from a compressed-air reservoir.
 *
 * Both stations were missing entirely, which left the head of the machine empty
 * once the station positions were corrected against the OEM plan view.
 */
const BELT_Y = deckHeights.products - 0.08;
const BELT_START = productPath.infeedX - 1.6;
/**
 * The belt hands over to the divider, so it ends at the divider's upstream face
 * rather than at an offset from `groupingX` that happened to run 1.5 units *past*
 * the divider and through its bed.
 */
const BELT_END = DIVIDER_ENTRY_X;
const BELT_LEN = BELT_END - BELT_START;
const BELT_MID = (BELT_START + BELT_END) / 2;

const PARTS: StaticPart[] = [
  // Infeed belt bed and side guides (OI 5-7 item 2)
  {
    mat: 'laneBeltBlue',
    size: [BELT_LEN, 0.06, 1.0],
    pos: [BELT_MID, BELT_Y, 0],
    receiveShadow: true,
  },
  ...[-1, 1].map((sign) => ({
    mat: 'steelMid' as const,
    size: [BELT_LEN, 0.14, 0.06] as [number, number, number],
    pos: [BELT_MID, BELT_Y + 0.1, sign * 0.56] as [number, number, number],
    receiveShadow: true,
  })),
  // Belt support frame
  ...[0.2, 0.55, 0.9].map((f) => ({
    mat: 'frame' as const,
    size: [0.14, 0.62, 1.3] as [number, number, number],
    pos: [BELT_START + BELT_LEN * f, BELT_Y - 0.36, 0] as [number, number, number],
    receiveShadow: true,
  })),

  // Blast station housing and compressed-air reservoir (OI 5-5 items 1/3)
  {
    mat: 'steelLight',
    size: [0.5, 0.5, 0.34],
    pos: [BELT_START + 0.9, BELT_Y + 0.5, 0.7],
    receiveShadow: true,
  },
  {
    mat: 'steelDark',
    shape: 'cylinder',
    size: [0.42, 1.2, 0.42],
    pos: [BELT_START + 0.3, BELT_Y + 0.5, 1.35],
    rot: [0, 0, Math.PI / 2],
    receiveShadow: true,
  },
];

export const InfeedStation = memo(function InfeedStation({
  running,
  minJamReached,
}: {
  running: boolean;
  /** Product has accumulated to the min-jam sensor, so a full row is available. */
  minJamReached: boolean;
}) {
  const groups = useMergedParts('InfeedStation', () => PARTS);
  const mats = materials();

  return (
    <group>
      {groups.map((g) => (
        <mesh key={g.key} geometry={g.geometry} material={mats[g.mat]} receiveShadow />
      ))}

      {/* Transfer sensor: starts the belt when covered (OI 5-7 item 1) */}
      <Box
        mat={running ? 'sensorOn' : 'sensorOff'}
        pos={[BELT_START + 0.4, BELT_Y + 0.34, -0.72]}
        size={[0.16, 0.18, 0.16]}
      />

      {/* "Min. jam" sensor: the following station starts once this is covered */}
      <Box
        mat={minJamReached ? 'ledGreenOn' : 'sensorOff'}
        pos={[BELT_END - 0.5, BELT_Y + 0.34, -0.72]}
        size={[0.16, 0.18, 0.16]}
      />

      {/* Fall-over stop pair: lower covered with upper clear means a toppled product */}
      {[0.22, 0.52].map((dy) => (
        <Box
          key={dy}
          mat="sensorOff"
          pos={[BELT_END - 1.4, BELT_Y + dy, 0.72]}
          size={[0.14, 0.12, 0.14]}
        />
      ))}

      {/* Product on the belt, sized from the format table like everything else */}
      {running &&
        [0, 1, 2, 3, 4].map((i) => (
          <Box
            key={i}
            mat="product"
            pos={[BELT_END - 0.4 - i * (PRODUCT_SIZE_3D[0] * 1.35), BELT_Y + PRODUCT_SIZE_3D[1] / 2 + 0.03, 0]}
            size={PRODUCT_SIZE_3D}
            castShadow
          />
        ))}
    </group>
  );
});
