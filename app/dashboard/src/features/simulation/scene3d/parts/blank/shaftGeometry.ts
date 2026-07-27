import { MACHINE_LAYOUT_3D } from '../../../machineLayout';

/**
 * Geometry of the inner blank guide shaft, shared between the shaft itself and
 * the suction arm that draws blanks down out of it.
 */
export const SHAFT_X = -4.1;
export const SHAFT_Z = MACHINE_LAYOUT_3D.blankPath.z;
/** Bottom opening — the arm's cups meet the lowest blank here. */
export const MOUTH_Y = 1.72;

export const BLANK_X = 3.1;
export const BLANK_Z = 2.0;
export const SHEET_THICKNESS = 0.055;
export const MAX_SHEETS = 14;

/** Where the suction cups meet the lowest blank. */
export const SHAFT_PICK = { x: SHAFT_X, y: MOUTH_Y, z: SHAFT_Z };
