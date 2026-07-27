import * as THREE from 'three';
import { PALETTE } from './palette';

/**
 * Shared material registry.
 *
 * The scene previously declared ~94 inline `<meshStandardMaterial>` elements, so
 * every mesh owned a private material instance. Three.js dedupes *shader
 * programs* by configuration (the scene only ever compiled 8), so the cost was
 * never program count — it was GPU memory, uniform uploads and the loss of any
 * chance to batch by material.
 *
 * Every mesh now points at one of these. Sensor/state colour changes swap
 * between two prebuilt materials rather than mutating or allocating.
 */

const std = (
  color: string,
  metalness: number,
  roughness: number,
  extra: Partial<THREE.MeshStandardMaterialParameters> = {}
) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });

function build() {
  return {
    // --- Structure -------------------------------------------------------
    frame: std(PALETTE.frame, 0.24, 0.48),
    frameDark: std(PALETTE.frameDark, 0.18, 0.58),
    frameDarkMatte: std(PALETTE.frameDark, 0.16, 0.8),
    deck: std(PALETTE.deck, 0.2, 0.7),
    cover: std(PALETTE.cover, 0.34, 0.34),
    coverDark: std(PALETTE.coverDark, 0.28, 0.4),
    rail: std(PALETTE.rail, 0.28, 0.46),

    // Stainless tones lifted straight from the old inline declarations
    steelLight: std('#CBD5E1', 0.42, 0.36),
    steelMid: std('#94A3B8', 0.3, 0.44),
    steelDark: std('#64748B', 0.22, 0.48),
    steelSlate: std('#475569', 0.26, 0.5),
    steelCharcoal: std('#3B4959', 0.24, 0.54),
    gunmetal: std('#1F2937', 0.3, 0.6),
    nearBlack: std('#111827', 0.24, 0.68),

    // --- Guards ----------------------------------------------------------
    guardSmoke: std(PALETTE.coverDark, 0.2, 0.35, {
      transparent: true,
      opacity: 0.18,
    }),

    // --- Transport / belts ----------------------------------------------
    chainGreen: std(PALETTE.chainGreen, 0.1, 0.55),
    chainGreenDark: std(PALETTE.chainGreenDark, 0.12, 0.6),
    beltGreen: std('#22C55E', 0.16, 0.5),
    beltGreenDeep: std('#15803D', 0.14, 0.56),
    laneBeltBlue: std(PALETTE.laneBeltBlue, 0.14, 0.52),
    beltBlue: std('#2563EB', 0.16, 0.5, { transparent: true, opacity: 0.9 }),
    beltBlueDeep: std('#1D4ED8', 0.16, 0.54, { transparent: true, opacity: 0.9 }),

    // --- Board / product --------------------------------------------------
    cartonBase: std(PALETTE.cartonBase, 0.06, 0.8),
    cartonFold: std(PALETTE.cartonFold, 0.03, 0.78),
    cartonEdge: std(PALETTE.cartonEdge, 0.02, 0.9),
    cartonAmber: std('#92400E', 0.04, 0.82),
    cartonDeep: std('#78350F', 0.04, 0.86),
    boardCream: std(PALETTE.boardCream, 0.02, 0.9),
    product: std(PALETTE.product, 0.28, 0.28),

    // --- Signals: prebuilt on/off pairs, swapped not mutated --------------
    sensorOn: std('#0EA5E9', 0.2, 0.4, {
      emissive: new THREE.Color('#38BDF8'),
      emissiveIntensity: 0.8,
    }),
    sensorOff: std(PALETTE.sensorOff, 0.2, 0.5),
    ledGreenOn: std('#86EFAC', 0.2, 0.4, {
      emissive: new THREE.Color('#14532D'),
      emissiveIntensity: 0.6,
    }),
    ledMintOn: std('#A7F3D0', 0.18, 0.42, {
      emissive: new THREE.Color('#34D399'),
      emissiveIntensity: 0.6,
    }),
    /** Owned by GlueStation, which drives its emissive. Do not reuse. */
    amberOn: std(PALETTE.actuatorBright, 0.2, 0.4, {
      emissive: new THREE.Color(PALETTE.actuatorBright),
      emissiveIntensity: 0.7,
    }),
    /**
     * Static amber for parts that only need the colour. The divider arms used
     * `amberOn`, whose emissive GlueStation rewrites every frame, so they lit up
     * and dimmed in sympathy with the glue heads at the far end of the machine.
     */
    amberStatic: std(PALETTE.actuatorBright, 0.2, 0.4, {
      emissive: new THREE.Color(PALETTE.actuatorBright),
      emissiveIntensity: 0.3,
    }),
    rejectBox: std(PALETTE.reject, 0.06, 0.72, {
      emissive: new THREE.Color(PALETTE.rejectDark),
      emissiveIntensity: 0.18,
    }),
    rejectBoxDark: std(PALETTE.rejectDark, 0.06, 0.72),
    rejectLid: std('#FB7185', 0.04, 0.74),

    // --- Dynamic emissives ------------------------------------------------
    // Each of these is owned by exactly one logical group whose members always
    // share the same state, so the owning component may mutate
    // `emissiveIntensity` directly. Do not reuse them across groups.
    pusherBeam: std(PALETTE.actuatorBright, 0.12, 0.36, {
      emissive: new THREE.Color(PALETTE.actuatorBright),
      emissiveIntensity: 0.06,
    }),
    pusherHead: std(PALETTE.actuator, 0.08, 0.28, {
      emissive: new THREE.Color(PALETTE.actuator),
      emissiveIntensity: 0.06,
    }),
    lugBody: std(PALETTE.product, 0.16, 0.34, {
      emissive: new THREE.Color('#14532D'),
      emissiveIntensity: 0.1,
    }),
    lugSensor: std('#A7F3D0', 0.08, 0.28, {
      emissive: new THREE.Color('#34D399'),
      emissiveIntensity: 0.04,
    }),
    laneBaseActive: std('#1E3A2F', 0.06, 0.92, {
      emissive: new THREE.Color('#14532D'),
      emissiveIntensity: 0.35,
    }),
    laneBaseIdle: std('#0F172A', 0.06, 0.92),
    clampBar: std('#CBD5E1', 0.42, 0.28, {
      emissive: new THREE.Color('#94A3B8'),
      emissiveIntensity: 0.14,
    }),
    suctionCup: std('#0EA5E9', 0.2, 0.4, {
      emissive: new THREE.Color('#0EA5E9'),
      emissiveIntensity: 0.1,
    }),
    cameraLens: std('#0EA5E9', 0.2, 0.4, {
      emissive: new THREE.Color('#38BDF8'),
      emissiveIntensity: 0.12,
    }),
    glueRail: std('#86EFAC', 0.16, 0.42, {
      emissive: new THREE.Color('#14532D'),
      emissiveIntensity: 0.04,
    }),
    /**
     * The glue bead on the carton seals. Owned by FormedCarton, which brightens
     * it as the seal sets — it shared `amberOn` with the glue nozzles, so the two
     * components overwrote each other's emissive every frame and which one won
     * depended on scene traversal order.
     */
    glueSeal: std(PALETTE.actuatorBright, 0.2, 0.4, {
      emissive: new THREE.Color(PALETTE.actuatorBright),
      emissiveIntensity: 0.1,
    }),
    /** Product slug instances — `opacity` is animated as the slug fades in/out. */
    slugProduct: std(PALETTE.product, 0.28, 0.28, {
      emissive: new THREE.Color(PALETTE.product),
      emissiveIntensity: 0.12,
      transparent: true,
    }),

    // --- Frame decks ------------------------------------------------------
    // The static frame block previously declared these inline with roughness
    // values varying by 0.02-0.04 between otherwise identical surfaces —
    // differences well below perceptual threshold. Consolidated to four.
    deckPlate: std(PALETTE.frame, 0.18, 0.57),
    deckMatte: std(PALETTE.deck, 0.08, 0.9),
    deckDark: std(PALETTE.frameDark, 0.08, 0.88),
    deckGlassDark: std(PALETTE.frameDark, 0.08, 0.9, { transparent: true, opacity: 0.4 }),

    // --- Misc -------------------------------------------------------------
    floor: std(PALETTE.deck, 0.02, 0.96),
    deckGlass: std(PALETTE.deck, 0.04, 0.96, { transparent: true, opacity: 0.34 }),
    rubberBlack: std(PALETTE.rubberBlack, 0.05, 0.85),
  };
}

export type MaterialKey = keyof ReturnType<typeof build>;

let cache: ReturnType<typeof build> | null = null;
let refs = 0;

/** The shared materials. Safe to call from render — built once. */
export function materials(): ReturnType<typeof build> {
  if (!cache) cache = build();
  return cache;
}

/**
 * Two mount points (`SimulationView` and `ThreeDSimPage`) can hold the scene at
 * once, so disposal is refcounted — tearing one down must not free materials the
 * other is still drawing with.
 */
export function acquireSceneAssets() {
  refs += 1;
  materials();
}

export function releaseSceneAssets() {
  refs -= 1;
  if (refs <= 0 && cache) {
    for (const m of Object.values(cache)) m.dispose();
    cache = null;
    refs = 0;
  }
}

/** Pick between two registry entries without allocating. */
export function toggleMaterial(on: boolean, onKey: MaterialKey, offKey: MaterialKey) {
  const m = materials();
  return on ? m[onKey] : m[offKey];
}
