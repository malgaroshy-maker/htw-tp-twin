import { MACHINE_LAYOUT_3D } from '../../../machineLayout';

/**
 * Geometry of the inner blank guide shaft, shared between the shaft itself and
 * the suction arm that draws blanks down out of it.
 */
/**
 * The shaft stands at the blank-withdraw station, over the blank transport it
 * feeds. It was pinned at -5.6, 0.8 downstream of `zones.blankWithdraw`, so the
 * station's own label and the hardware it names sat apart.
 */
export const SHAFT_X = MACHINE_LAYOUT_3D.zones.blankWithdraw.x;
export const SHAFT_Z = MACHINE_LAYOUT_3D.blankPath.z;

/**
 * Surface of the blank transport below — where the arm releases the blank.
 * `sampleBlankPath` puts the travelling blank here too, so a released blank and
 * the blank that starts travelling are at the same height.
 */
export const DEPOSIT_Y = MACHINE_LAYOUT_3D.deckHeights.lowTransport + 0.12;
/** Bottom opening — the arm's cups meet the lowest blank here. */
export const MOUTH_Y = 1.72;

export const BLANK_X = 3.1;
export const BLANK_Z = 2.0;
export const SHEET_THICKNESS = 0.055;
export const MAX_SHEETS = 14;

/** Where the suction cups meet the lowest blank. */
export const SHAFT_PICK = { x: SHAFT_X, y: MOUTH_Y, z: SHAFT_Z };
