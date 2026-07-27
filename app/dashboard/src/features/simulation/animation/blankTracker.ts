/**
 * The flat blank's *displayed* X and whether it is in transit.
 *
 * Same contract as `slugTracker`, for the same reason. The blank transport does
 * not slide blanks along — a chain carries **drivers** that catch each blank and
 * push it (OI 5-34). A driver and the blank it is pushing therefore cannot move
 * independently, but they did: `FlatBlank` damped the polled `blankX` while
 * `BlankDrivers` free-ran on a fixed `delta * 0.09`, so the drivers drifted
 * through the board they are supposed to be driving.
 *
 * One writer (`FlatBlank`), one reader (`BlankDrivers`).
 */

let displayX = 0;
let inTransit = false;

/** Called by `FlatBlank` once per frame with its damped position. */
export function setBlankDisplay(x: number, visible: boolean) {
  displayX = x;
  inTransit = visible;
}

export function blankDisplayX() {
  return displayX;
}

/** True while a blank is on the transport and a driver should be behind it. */
export function blankInTransit() {
  return inTransit;
}
