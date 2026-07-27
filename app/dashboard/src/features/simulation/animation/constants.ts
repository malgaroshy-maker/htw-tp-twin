/**
 * Timing shared by the 2D and 3D machine views.
 *
 * The backend is polled every 500 ms, so raw `cycle_phase_progress` arrives as a
 * staircase. Both views smooth it; keeping the constants in one place stops the
 * two from drifting apart.
 */

/**
 * How long to blend from the previously displayed progress to a newly arrived
 * snapshot. Longer than the 500 ms poll interval on purpose — motion stays
 * continuous even when a poll is late.
 */
export const SNAPSHOT_BLEND_MS = 1200;

/** Damping applied to visual motion so the machine reads as heavy, not twitchy. */
export const VISUAL_SPEED_SCALE = 0.42;

/**
 * Per-frame follow factor for 3D parts that chase a target position.
 * Tuned to settle within roughly one poll interval at 60 fps.
 */
export const FOLLOW_LAMBDA = 6.5;

/**
 * Frame-rate independent damped follow.
 *
 * `THREE.MathUtils.lerp(current, target, 0.1)` — the pattern this replaces —
 * converges at a rate that depends on frame rate, so the same scene animates
 * faster on a 144 Hz display than on a 60 Hz one. This is the standard
 * exponential-decay form, which does not.
 */
export function damp(current: number, target: number, lambda: number, delta: number) {
  return target + (current - target) * Math.exp(-lambda * delta);
}

/**
 * Damped follow for a part that is only on screen during part of the cycle.
 *
 * A plain `damp` is wrong for these. A part like the flat blank travels to
 * x = 16 by the end of DISCHARGE and its target then resets to the magazine at
 * x = -13.4 for the next cycle. While hidden it kept damping across that
 * 29-unit gap, so it was still mid-slide when the next BLANK_FEED made it
 * visible again — and it appeared **travelling backwards up the machine**.
 *
 * While hidden there is nothing to smooth, so the display value tracks the
 * target exactly and the part is always in position the moment it appears.
 */
export function dampVisible(
  current: number,
  target: number,
  visible: boolean,
  lambda: number,
  delta: number
) {
  if (!visible) return target;
  return damp(current, target, lambda, delta);
}
