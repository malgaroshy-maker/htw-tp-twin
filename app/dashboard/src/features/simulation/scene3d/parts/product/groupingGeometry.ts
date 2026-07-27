import { MACHINE_LAYOUT_3D, TRAY_SIZE_3D, REAL_MM, MM } from '../../../machineLayout';

/**
 * Shared geometry of the grouping section.
 *
 * The stopper defines where the accumulating product stack *ends*, and the
 * terminal sits one formation length upstream. Both the lane fill and the
 * blades read these, so a product cannot come to rest somewhere the stopper
 * blade is not.
 */
const { zones, deckHeights } = MACHINE_LAYOUT_3D;

/** Downstream end of the lanes: products accumulate against this blade. */
export const STOPPER_X = zones.grouping.x + zones.grouping.width / 2 - 0.35;

/** One formation length upstream — closes behind the captured group. */
export const TERMINAL_X = STOPPER_X - TRAY_SIZE_3D[0] - 0.2;

/** Along-travel pitch of one product slot, from the tray footprint (OI 2-23). */
export const SLOT_PITCH = (REAL_MM.tray.length / 10) * MM;

export const BLADE_UP = deckHeights.products + 0.62;
export const BLADE_DOWN = deckHeights.products + 0.02;

/**
 * Resting X of the `slot`-th product in a lane, counted from the stopper
 * backwards.
 *
 * Products queue **against the stopper**, so slot 0 sits hard against the blade
 * and each subsequent one stacks upstream behind it. The previous version laid
 * them out forwards from a fixed upstream origin, which meant a filling lane
 * grew *towards* the stopper and left a gap in front of it — the opposite of how
 * an accumulating lane behaves.
 */
export function slotX(slot: number) {
  return STOPPER_X - 0.35 - slot * SLOT_PITCH;
}

/** Where a newly divided product enters the lane, upstream of the queue. */
export const LANE_ENTRY_X = zones.grouping.x - zones.grouping.width / 2 - 0.4;
