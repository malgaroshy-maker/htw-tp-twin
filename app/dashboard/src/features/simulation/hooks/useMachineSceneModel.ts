import { useMemo } from 'react';
import type { SimulatorState } from '../../../hooks/simTypes';
import { MACHINE_LAYOUT_3D } from '../machineLayout';

export interface MachineSceneModel {
  phase: string;
  phaseProgress: number;
  visualProgress: number;
  machineState: string;
  rowCount: number;
  colCount: number;
  groupedCount: number;
  laneFillCounts: number[];
  targetGroupCount: number;
  currentLane: number;
  blankVisible: boolean;
  blankX: number;
  blankY: number;
  blankZ: number;
  blankPitch: number;
  slugVisible: boolean;
  slugX: number;
  slugCompression: number;
  sidePusherProgress: number;
  chainInfeedActive: boolean;
  chainInfeedOffset: number;
  gapSensorActive: boolean;
  completenessCameraActive: boolean;
  slugOpacity: number;
  pusherX: number;
  packVisible: boolean;
  packX: number;
  packZ: number;
  packFormProgress: number;
  glueActive: boolean;
  guideActive: boolean;
  rejectActive: boolean;
  rejectCount: number;
  rejectConveyorPositions: number[];
  lastRejectReason: string;
  faultCode: string;
  warningCode: string;
  phaseDescription: string;
  machineMode: string;
  isManualMode: boolean;
  /** Blanks left in the inner guide shaft (sns.blanks_remaining). */
  blanksRemaining: number;
  /** Vacuum applied at the suction cups; shut off at the arm's lower end position. */
  vacuumOk: boolean;
  /** Chain stopper blade down, holding product back (OT p10 item 1). */
  stopperClosed: boolean;
  /** Terminal blade down, closing behind the captured formation (item 2). */
  terminalClosed: boolean;
  /** Divider gap sensor: clear enough for the divider to swing. */
  dividerGapClear: boolean;
  /** Lane filling matches the virtual model. */
  laneFillOk: boolean;
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

function smoothstep(t: number) {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
}

const PHASE_DESCRIPTIONS: Record<string, string> = {
  IDLE: 'Machine idle. Blank magazine, grouping, and transport decks are waiting for the next cycle.',
  GROUPING: 'Single-file product flow is separated, divided, and built lane by lane at the grouping clamp.',
  CAPTURED: 'The grouped formation is held at the chain stop while the lower blank system prepares the next blank.',
  BLANK_FEED: 'Cross transfer and blank withdraw feed a flat blank onto the lower blank transport toward transfer.',
  TRANSFER: 'The chain infeed pusher takes the grouped formation and pushes it onto the flat blank at transfer.',
  PACKING: 'Main transport guides, folding elements, and glue heads progressively build the wrap-around carton.',
  DISCHARGE: 'The finished carton remains under guides during travel and leaves the machine as a fully formed pack.',
};

export function useMachineSceneModel(state: SimulatorState | null): MachineSceneModel | null {
  return useMemo(() => {
    if (!state) return null;

    const { sts, out, cfg, sns } = state;
    const phase = sts.cycle_phase;
    const progress = sts.cycle_phase_progress || 0;
    const visualProgress = smoothstep(progress);
    const rowCount = cfg?.grid_rows || 3;
    const colCount = cfg?.grid_cols || 3;
    const targetGroupCount = Math.max(1, rowCount * colCount);
    const laneCapacity = Math.max(1, colCount);
    const laneFillCounts = Array.from({ length: rowCount }, (_, lane) => {
      const start = lane * laneCapacity;
      return Math.max(0, Math.min(laneCapacity, out.grouped_count - start));
    });
    const currentLane = Math.min(rowCount - 1, Math.floor(Math.min(out.grouped_count, targetGroupCount - 1) / laneCapacity));

    const { blankPath, productPath } = MACHINE_LAYOUT_3D;
    let blankX = blankPath.magazineStartX;
    let blankY = blankPath.lowY;
    const blankZ = blankPath.z;
    let blankPitch = 0;
    if (phase === 'BLANK_FEED') {
      blankX = visualProgress < 0.25
        ? lerp(blankPath.crossTransferX, blankPath.blankWithdrawX, visualProgress / 0.25)
        : lerp(blankPath.blankWithdrawX, blankPath.transferX, (visualProgress - 0.25) / 0.75);
    } else if (phase === 'TRANSFER') {
      blankX = blankPath.transferX;
    } else if (phase === 'PACKING') {
      blankX = lerp(blankPath.transferX, blankPath.packingX + 1.6, Math.min(visualProgress, 0.52) / 0.52);
    } else if (phase === 'DISCHARGE') {
      blankX = lerp(blankPath.packingX, blankPath.dischargeX, visualProgress);
    }

    if (blankX <= blankPath.rampStartX) {
      blankY = blankPath.lowY;
      blankPitch = 0;
    } else if (blankX < blankPath.transferX) {
      const ascentT = smoothstep((blankX - blankPath.rampStartX) / (blankPath.transferX - blankPath.rampStartX));
      blankY = lerp(blankPath.lowY, blankPath.transferY, ascentT);
      blankPitch = lerp(0, -0.34, Math.sin(ascentT * Math.PI));
    } else {
      blankY = blankPath.transferY;
      blankPitch = 0;
    }

    let slugX = productPath.clampX;
    let slugCompression = 0;
    let slugOpacity = 0;
    let sidePusherProgress = 0;
    if (phase === 'CAPTURED') {
      slugX = lerp(productPath.clampX - 0.35, productPath.clampX, visualProgress);
      slugOpacity = 1;
      sidePusherProgress = 0.12;
    } else if (phase === 'BLANK_FEED') {
      slugX = productPath.clampX;
      slugCompression = 0.18 + Math.min(visualProgress / 0.85, 0.34);
      slugOpacity = 1;
      sidePusherProgress = 0.2 + Math.min(visualProgress / 0.85, 0.32);
    } else if (phase === 'TRANSFER') {
      slugX = lerp(productPath.clampX + 0.2, productPath.transferX + 0.55, visualProgress);
      slugCompression = 0.56 + Math.min(visualProgress / 0.72, 0.44);
      slugOpacity = lerp(1, 0.45, Math.min(visualProgress, 0.8) / 0.8);
      sidePusherProgress = 0.52 + Math.min(visualProgress / 0.78, 0.48);
    } else if (phase === 'PACKING') {
      slugX = lerp(productPath.packStartX, productPath.packStartX + 1.4, Math.min(visualProgress, 0.25) / 0.25);
      slugCompression = 0.86 + Math.min(visualProgress / 0.52, 0.14);
      slugOpacity = visualProgress < 0.38
        ? 0.36
        : lerp(0.36, 0, Math.min((visualProgress - 0.38) / 0.42, 1));
      sidePusherProgress = 1;
    }

    let pusherX = productPath.transferX - 2.4;
    if (phase === 'TRANSFER') {
      pusherX = lerp(productPath.transferX - 2.4, productPath.transferX + 0.5, visualProgress);
    }

    let packVisible = false;
    let packX = productPath.packStartX;
    const packZ = 0;
    let packFormProgress = 0;
    if (phase === 'PACKING') {
      packVisible = true;
      packX = lerp(productPath.packStartX, productPath.packEndX, visualProgress);
      packFormProgress = visualProgress < 0.34
        ? lerp(0, 0.08, visualProgress / 0.34)
        : lerp(0.08, 1, (visualProgress - 0.34) / 0.66);
    } else if (phase === 'DISCHARGE') {
      packVisible = true;
      packX = lerp(productPath.packEndX, productPath.dischargeX, visualProgress);
      packFormProgress = 1;
    }

    const rejectConveyorPositions = Array.from({ length: Math.min(3, out.reject_accumulation_count) }, (_, index) =>
      productPath.rejectBranchX + index * 1.15
    );

    return {
      phase,
      phaseProgress: progress,
      visualProgress,
      machineState: sts.machine_state,
      rowCount,
      colCount,
      groupedCount: out.grouped_count,
      laneFillCounts,
      targetGroupCount,
      currentLane,
      blankVisible: phase === 'BLANK_FEED' || phase === 'TRANSFER' || phase === 'PACKING',
      blankX,
      blankY,
      blankZ,
      blankPitch,
      slugVisible: slugOpacity > 0.02,
      slugX,
      slugCompression,
      sidePusherProgress,
      chainInfeedActive: phase === 'BLANK_FEED' || phase === 'TRANSFER' || phase === 'CAPTURED',
      chainInfeedOffset: visualProgress,
      gapSensorActive: phase === 'CAPTURED' || phase === 'BLANK_FEED' || phase === 'TRANSFER',
      completenessCameraActive: phase === 'TRANSFER' || phase === 'PACKING',
      slugOpacity,
      pusherX,
      packVisible,
      packX,
      packZ,
      packFormProgress,
      glueActive: phase === 'PACKING' || phase === 'DISCHARGE',
      guideActive: phase === 'PACKING' || phase === 'DISCHARGE',
      rejectActive: phase === 'DISCHARGE' && (sns.open_flap_detected || !sns.tray_plate_sensor_ok),
      rejectCount: out.reject_accumulation_count,
      rejectConveyorPositions,
      lastRejectReason: out.last_reject_reason,
      faultCode: state.fault.active_code,
      warningCode: state.warn.active_code,
      phaseDescription: PHASE_DESCRIPTIONS[phase] ?? 'Machine cycle in progress.',
      blanksRemaining: out.blanks_remaining ?? 0,
      vacuumOk: sns.tray_vacuum_ok ?? false,
      stopperClosed: sns.stopper_closed ?? false,
      terminalClosed: sns.terminal_closed ?? false,
      dividerGapClear: sns.divider_gap_clear ?? true,
      laneFillOk: sns.lane_fill_ok ?? true,
      machineMode: sts.machine_mode,
      isManualMode: sts.machine_mode === 'MANUAL',
    };
  }, [state]);
}
