import { MACHINE_LAYOUT_3D } from '../../machineLayout';

export function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

export function smoothstep(t: number) {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * Position and pitch of the flat blank along the magazine → ramp → transfer path.
 * The ramp section eases so the blank noses up rather than kinking.
 */
export function sampleBlankPath(x: number) {
  const { blankPath, deckHeights } = MACHINE_LAYOUT_3D;
  if (x <= blankPath.rampStartX) {
    return { x, y: deckHeights.lowTransport + 0.1, angle: 0 };
  }
  if (x >= blankPath.transferX) {
    return { x, y: blankPath.transferY, angle: 0 };
  }

  const t = (x - blankPath.rampStartX) / (blankPath.transferX - blankPath.rampStartX);
  const y = lerp(deckHeights.lowTransport + 0.1, blankPath.transferY, smoothstep(t));

  const epsilon = 0.08;
  const x2 = Math.min(blankPath.transferX, x + epsilon);
  const t2 = (x2 - blankPath.rampStartX) / (blankPath.transferX - blankPath.rampStartX);
  const y2 = lerp(deckHeights.lowTransport + 0.1, blankPath.transferY, smoothstep(t2));

  return { x, y, angle: Math.atan2(y2 - y, x2 - x) };
}
