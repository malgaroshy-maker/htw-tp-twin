/**
 * The formation's *displayed* X, shared between the parts that must agree on it.
 *
 * `ProductSlug` damps the polled `slugX` so the formation glides. `ChainInfeed`
 * locks its pusher plates to the formation. If the two read different values —
 * and they did, the slug using its damped position and the chain infeed the raw
 * 2 Hz staircase — the plates lag the formation by up to half a poll and then
 * snap forward to catch it, twice a second, which is exactly the "chain infeed
 * lags" symptom.
 *
 * One writer (`ProductSlug`), any number of readers. Module state is safe here
 * for the same reason the material registry is: both mount points render the same
 * simulator snapshot, so they would compute the same number anyway.
 */

let displayX = 0;

/** Called by `ProductSlug` once per frame with its damped position. */
export function setSlugDisplayX(x: number) {
  displayX = x;
}

/** The formation's current on-screen X. */
export function slugDisplayX() {
  return displayX;
}
