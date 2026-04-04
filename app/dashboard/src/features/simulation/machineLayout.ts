export const MACHINE_LAYOUT_2D = {
  viewBox: { width: 1000, height: 600 },
  chassis: { x: 46, y: 150, width: 910, height: 310 },
  infeed: { x: 58, y: 230, width: 110, height: 58, centerY: 259 },
  separator: { x: 188, y: 259 },
  grouping: {
    x: 208,
    y: 184,
    width: 214,
    height: 150,
    centerY: 259,
    laneSpread: 44,
    clampX: 402,
    chainStopX: 424,
  },
  transfer: { x: 440, y: 186, width: 88, height: 146, centerX: 484 },
  mainTransport: { x: 536, y: 216, width: 366, height: 86, centerY: 259 },
  glue: { x: 648, y: 216, width: 168, height: 86 },
  discharge: { x: 904, y: 216, width: 52, height: 86 },
  blankMagazine: { x: 72, y: 346, width: 190, height: 94 },
  crossTransfer: { x: 266, y: 360, width: 86, height: 68 },
  blankWithdraw: { x: 350, y: 344, width: 110, height: 94 },
  blankTransport: { x: 454, y: 366, width: 410, height: 26, centerY: 379 },
  glueGuideSpan: { x1: 586, x2: 910, topY: 226, bottomY: 292 },
  reject: { x: 864, y: 314, width: 104, height: 34, branchY: 352 },
};

export const MACHINE_LAYOUT_3D = {
  frame: {
    base: { x: 0.5, y: 0.16, z: 0, width: 35.5, height: 0.62, depth: 14.8 },
    lowDeck: { x: -6.1, y: 0.68, z: 2.35, width: 19.6, height: 0.22, depth: 3.2 },
    highGroupingDeck: { x: -6.8, y: 2.82, z: 0, width: 10.2, height: 0.18, depth: 7.1 },
    highTransferDeck: { x: 0.8, y: 2.98, z: 0, width: 5, height: 0.2, depth: 6.3 },
    highTransportDeck: { x: 12, y: 2.98, z: 0, width: 15, height: 0.2, depth: 4.9 },
  },
  supports: [
    [-15.6, 1.38, 3.7],
    [-11.4, 1.38, 3.7],
    [-7.2, 1.38, 3.7],
    [-8.9, 1.38, -3.2],
    [-3.6, 1.38, -3.2],
    [1.1, 1.38, -3.2],
    [5.6, 1.38, -2.4],
    [11.4, 1.38, -2.4],
    [16.3, 1.38, -2.4],
  ] as const,
  zones: {
    blankMagazine: { x: -14.2, z: 4.7, width: 5.6, depth: 3.2 },
    crossTransfer: { x: -9.1, z: 4.7, width: 4.0, depth: 2.6 },
    blankWithdraw: { x: -4.9, z: 3.05, width: 4.2, depth: 2.3 },
    blankTransport: { x: -0.5, z: 2.2, width: 17.0, depth: 1.6 },
    grouping: { x: -4, z: 0, width: 8.8, depth: 5.8 },
    transfer: { x: 1, z: 0, width: 4.0, depth: 5.4 },
    mainTransport: { x: 8.6, z: 0, width: 13.8, depth: 4.0 },
    discharge: { x: 15.3, z: 0, width: 3.6, depth: 4.0 },
    rejectConveyor: { x: 15.8, z: 3.55, width: 5.6, depth: 1.6 },
  },
  blankPath: {
    magazineStartX: -14.6,
    crossTransferX: -9.8,
    blankWithdrawX: -5.4,
    rampStartX: -1.5,
    transferX: 4,
    packingX: 4.8,
    dischargeX: 14.8,
    z: 2.2,
    lowY: 1.08,
    transferY: 2.82,
  },
  productPath: {
    infeedX: -11.6,
    groupingX: -7.0,
    clampX: -0.3,
    transferX: 1.5,
    packStartX: 4,
    packEndX: 11.4,
    dischargeX: 15.1,
    rejectBranchX: 15.7,
  },
  deckHeights: {
    low: 0.58,
    lowTransport: 0.88,
    blank: 1.08,
    high: 3.02,
    products: 3.44,
    guides: 3.9,
    glue: 4.46,
  },
  laneSpread: 1.55,
  productSize3D: 0.46,
  productScale2D: 0.82,
};

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

export function getLaneCenters2D(rows: number) {
  const center = MACHINE_LAYOUT_2D.grouping.centerY;
  const spread = MACHINE_LAYOUT_2D.grouping.laneSpread;
  return Array.from({ length: rows }, (_, lane) =>
    lerp(center - spread, center + spread, rows === 1 ? 0.5 : lane / (rows - 1))
  );
}

export function getLaneZ3D(rows: number) {
  const spread = MACHINE_LAYOUT_3D.laneSpread;
  return Array.from({ length: rows }, (_, lane) =>
    lerp(-spread, spread, rows === 1 ? 0.5 : lane / (rows - 1))
  );
}
