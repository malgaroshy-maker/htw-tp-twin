/**
 * Colour language for the machine.
 *
 * Sampled from the OEM CAD renders and training photos — see
 * `docs/3d-rebuild/MACHINE_REFERENCE.md`. The real Meurer CM/HTW is brushed
 * stainless with green modular plastic transport chain, blue lane belts in the
 * grouping unit, dark grey covers and cream corrugated blanks.
 */
export const PALETTE = {
  // Structure
  frame: '#334155',
  frameDark: '#1E293B',
  deck: '#0F172A',
  cover: '#A8B4C3',
  coverDark: '#7B8795',
  rail: '#94A3B8',

  // Actuators / motion
  actuator: '#C2410C',
  actuatorBright: '#F59E0B',

  // Board and product
  cartonBase: '#8B5A2B',
  cartonFold: '#A16207',
  cartonEdge: '#6B3E14',
  product: '#10B981',

  // Real-machine accents (used from Phase 5 onward)
  chainGreen: '#2F9E44',
  chainGreenDark: '#1E6B2E',
  laneBeltBlue: '#1E3A8A',
  boardCream: '#E4D5B0',
  rubberBlack: '#14181F',

  // Signal colours
  sensorOn: '#38BDF8',
  sensorOff: '#1E293B',
  reject: '#B91C1C',
  rejectDark: '#7F1D1D',
} as const;

export type PaletteKey = keyof typeof PALETTE;
