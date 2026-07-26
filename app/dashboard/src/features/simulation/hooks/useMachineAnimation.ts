import { useEffect, useRef, useCallback, useId } from 'react';
import type { SimulatorState } from '../../../hooks/simTypes';
import { MACHINE_LAYOUT_2D, getLaneCenters2D } from '../machineLayout';

import { SNAPSHOT_BLEND_MS, VISUAL_SPEED_SCALE } from '../animation/constants';

const SVG_NS = "http://www.w3.org/2000/svg";

interface InFlightProduct {
  id: number;
  pathState: string;
  lane: number;
  positionInPack: number;
  x: number;
  y: number;
  el: SVGGElement;
}

function buildPackMarkup(rows: number, cols: number, formProgress: number) {
  const width = cols * 12 + 12;
  const height = rows * 14 + 10;
  const sideLift = lerp(2, 13, formProgress);
  const topFold = lerp(0, 8, formProgress);
  const glueGlow = formProgress > 0.35 ? 0.12 + formProgress * 0.18 : 0;

  return `
    <g>
      <rect x="0" y="6" width="${width}" height="${height - 12}" fill="#7C2D12" rx="3" stroke="#451A03" stroke-width="1.4" />
      <rect x="3" y="3" width="${width - 6}" height="${height - 6}" fill="#92400E" rx="3" opacity="0.92" />
      <path d="M0,6 L${width},6 L${width - topFold},0 L${topFold},0 Z" fill="#B45309" opacity="${0.45 + formProgress * 0.22}" />
      <path d="M0,${height - 6} L${width},${height - 6} L${width - topFold},${height} L${topFold},${height} Z" fill="#78350F" opacity="${0.35 + formProgress * 0.22}" />
      <rect x="4" y="${6 - sideLift}" width="8" height="${height - 12 + sideLift}" fill="#B45309" opacity="${0.48 + formProgress * 0.3}" rx="2" />
      <rect x="${width - 12}" y="${6 - sideLift}" width="8" height="${height - 12 + sideLift}" fill="#B45309" opacity="${0.48 + formProgress * 0.3}" rx="2" />
      <line x1="${width * 0.25}" y1="8" x2="${width * 0.25}" y2="${height - 8}" stroke="#451A03" stroke-width="0.7" opacity="0.35" />
      <line x1="${width * 0.75}" y1="8" x2="${width * 0.75}" y2="${height - 8}" stroke="#451A03" stroke-width="0.7" opacity="0.35" />
      <rect x="${width * 0.18}" y="${height - 3}" width="${width * 0.18}" height="4" fill="#475569" rx="1" opacity="0.9" />
      <rect x="${width * 0.64}" y="${height - 3}" width="${width * 0.18}" height="4" fill="#475569" rx="1" opacity="0.9" />
      <rect x="6" y="2" width="${width - 12}" height="2" fill="#F59E0B" opacity="${glueGlow}" rx="1" />
      <rect x="6" y="${height - 4}" width="${width - 12}" height="2" fill="#F59E0B" opacity="${glueGlow * 0.9}" rx="1" />
    </g>`;
}

function buildFormationMarkup(rows: number, cols: number) {
  const cellW = 10;
  const cellH = 12;
  const laneGap = 5;
  const nodes: string[] = [];

  for (let lane = 0; lane < rows; lane += 1) {
    for (let slot = 0; slot < cols; slot += 1) {
      const x = slot * cellW;
      const y = lane * (cellH + laneGap);
      nodes.push(
        `<rect x="${x}" y="${y}" width="${cellW - 2}" height="${cellH - 2}" rx="2" fill="url(#product-metallic)" stroke="rgba(255,255,255,0.7)" stroke-width="0.7" />`
      );
    }
  }

  return nodes.join('');
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

function getLaneIndexForPackPosition(positionInPack: number, lanes: number, laneCapacity: number) {
  const maxPosition = Math.max(0, lanes * laneCapacity - 1);
  const clamped = Math.max(0, Math.min(positionInPack, maxPosition));
  return Math.min(lanes - 1, Math.floor(clamped / laneCapacity));
}

export function useMachineAnimation(state: SimulatorState | null) {
  const requestRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number | null>(null);
  
  // 1-9: Mechanical Refs
  const dividerRef = useRef<SVGGElement>(null);
  const separatorRef = useRef<SVGGElement>(null);
  const stopperRef = useRef<SVGGElement>(null);
  const terminalRef = useRef<SVGGElement>(null);
  const pusherRef = useRef<SVGGElement>(null);
  const gantryRef = useRef<SVGGElement>(null);
  const blankRef = useRef<SVGGElement>(null);
  const chainRef = useRef<SVGGElement>(null);
  const punchRef = useRef<SVGGElement>(null);
  const sidePusherTopRef = useRef<SVGGElement>(null);
  const sidePusherBottomRef = useRef<SVGGElement>(null);
  const productLayerRef = useRef<SVGGElement>(null);
  const formationRef = useRef<SVGGElement>(null);
  const packRef = useRef<SVGGElement>(null);
  const formationMarkupRef = useRef<string>('');
  const packInnerMarkupRef = useRef<string>('');
  const sessionIDBase = useId().replace(/:/g, '');
  const sessionID = useRef(sessionIDBase);
  const inFlightProducts = useRef<InFlightProduct[]>([]);
  const lastProductIn = useRef(0);
  const chainOffset = useRef(0);
  const stateRef = useRef<SimulatorState | null>(state);
  const visualProgressRef = useRef(0);
  const progressFromRef = useRef(0);
  const progressToRef = useRef(0);
  const progressBlendStartRef = useRef<number | null>(null);
  const currentDischargeRejectRef = useRef(false);
  const lastDividerReleaseAtRef = useRef(0);

  // 17-18: Sync & Callback
  useEffect(() => {
    const previous = stateRef.current;
    stateRef.current = state;

    if (!state) {
      visualProgressRef.current = 0;
      progressFromRef.current = 0;
      progressToRef.current = 0;
      progressBlendStartRef.current = null;
      currentDischargeRejectRef.current = false;
      return;
    }

    const nextProgress = state.sts.cycle_phase_progress || 0;

    if (
      previous &&
      previous.sts.machine_state === state.sts.machine_state &&
      previous.sts.cycle_phase === state.sts.cycle_phase
    ) {
      progressFromRef.current = visualProgressRef.current;
      progressToRef.current = nextProgress;
      progressBlendStartRef.current = performance.now();
    } else {
      visualProgressRef.current = nextProgress;
      progressFromRef.current = nextProgress;
      progressToRef.current = nextProgress;
      progressBlendStartRef.current = null;
    }

    if (state.sts.cycle_phase !== 'DISCHARGE') {
      currentDischargeRejectRef.current = false;
    } else if (state.sns.open_flap_detected || !state.sns.tray_plate_sensor_ok) {
      currentDischargeRejectRef.current = true;
    }
  }, [state]);
  
  const animate = useCallback(function animationLoop(timestamp: number) {
    const s = stateRef.current;
    if (!s || !productLayerRef.current) {
      requestRef.current = requestAnimationFrame(animationLoop);
      return;
    }

    const prevFrameTime = lastFrameTimeRef.current ?? timestamp;
    const deltaSeconds = Math.min((timestamp - prevFrameTime) / 1000, 0.05) * VISUAL_SPEED_SCALE;
    lastFrameTimeRef.current = timestamp;

    try {
      const { sts, out, sns, cfg } = s;
      let progress = sts.cycle_phase_progress || 0;
      if (progressBlendStartRef.current !== null) {
        const blendT = Math.min((timestamp - progressBlendStartRef.current) / SNAPSHOT_BLEND_MS, 1);
        progress = lerp(progressFromRef.current, progressToRef.current, blendT);
        visualProgressRef.current = progress;
        if (blendT >= 1) {
          progressBlendStartRef.current = null;
        }
      } else {
        visualProgressRef.current = progress;
      }
      const phase = sts.cycle_phase;
      const isRunning = sts.machine_state === 'RUNNING';
      const rowCount = cfg?.grid_rows || 3;
      const colCount = cfg?.grid_cols || 3;
      const laneCapacity = Math.max(1, colCount);
      const laneCenters = getLaneCenters2D(rowCount);
      const groupingHeight = MACHINE_LAYOUT_2D.grouping.height;
      const infeedY = MACHINE_LAYOUT_2D.infeed.centerY;
      const meteringStopX = MACHINE_LAYOUT_2D.separator.x - 20;
      const dividerExitX = MACHINE_LAYOUT_2D.grouping.x + 6;
      const productSpacing = 18;
      const releaseIntervalSec = 0.06;
      const blankTransferX = MACHINE_LAYOUT_2D.transfer.centerX - 6;
      const blankStartX = MACHINE_LAYOUT_2D.blankTransport.x + 22;
      const formationBaseX = MACHINE_LAYOUT_2D.grouping.chainStopX - colCount * 12 - 22;
      const formationBaseY = MACHINE_LAYOUT_2D.grouping.centerY - rowCount * 10;
      const packBaseY = MACHINE_LAYOUT_2D.mainTransport.centerY - rowCount * 9;

      if (dividerRef.current) {
        const lane = getLaneIndexForPackPosition(out.grouped_count, rowCount, laneCapacity);
        const angle = (lane - Math.floor(rowCount / 2)) * (24 / rowCount);
        dividerRef.current.setAttribute('transform', `rotate(${angle})`);
      }
      if (separatorRef.current) {
        const timeSinceRelease = (timestamp - lastDividerReleaseAtRef.current) / 1000;
        const openingWindowSec = 0.05;
        const openRatio = timeSinceRelease >= 0 && timeSinceRelease < openingWindowSec
          ? 1 - timeSinceRelease / openingWindowSec
          : 0;
        const lift = openRatio * -16;
        separatorRef.current.setAttribute('transform', `translate(0, ${lift})`);
      }
      if (stopperRef.current) stopperRef.current.setAttribute('transform', `translate(0, ${sns.stopper_closed ? 0 : groupingHeight})`);
      if (terminalRef.current) terminalRef.current.setAttribute('transform', `translate(0, ${sns.terminal_closed ? 0 : -groupingHeight})`);
      if (pusherRef.current) {
        const stroke =
          phase === 'TRANSFER'
            ? Math.min(1, progress) * 118
            : phase === 'CAPTURED' && sns.terminal_closed
              ? 0
              : 0;
        pusherRef.current.setAttribute('transform', `translate(${stroke}, 0)`);
      }
      if (gantryRef.current) {
        let gantryX = blankStartX;
        const gantryY = MACHINE_LAYOUT_2D.blankTransport.centerY;

        if (phase === 'BLANK_FEED') {
          gantryX = progress < 0.2
            ? lerp(MACHINE_LAYOUT_2D.blankWithdraw.x + 40, blankStartX, progress / 0.2)
            : lerp(blankStartX, blankTransferX, (progress - 0.2) / 0.8);
        } else if (phase === 'TRANSFER') {
          gantryX = blankTransferX;
        } else if (phase === 'PACKING' || phase === 'DISCHARGE') {
          gantryX = lerp(blankTransferX + 8, MACHINE_LAYOUT_2D.mainTransport.x + 40, Math.min(progress, 1));
        }

        gantryRef.current.setAttribute('transform', `translate(${gantryX}, ${gantryY})`);
      }
      if (blankRef.current) {
        const blankVisible = phase === 'BLANK_FEED' || phase === 'TRANSFER' || phase === 'PACKING';
        blankRef.current.setAttribute('opacity', blankVisible ? '1' : '0');
        if (blankVisible) {
          let blankScaleX = 1;
          if (phase === 'PACKING') {
            blankScaleX = lerp(1, 0.84, Math.min(progress, 0.45) / 0.45);
          }
          blankRef.current.setAttribute('transform', `translate(0, 0) scale(${blankScaleX}, 1)`);
        }
      }
      if (punchRef.current) {
        const divertProgress =
          phase === 'DISCHARGE' && currentDischargeRejectRef.current && progress >= 0.5
            ? Math.min(1, (progress - 0.5) / 0.25)
            : 0;
        const gateX = divertProgress * 18;
        const gateY = divertProgress * 10;
        punchRef.current.setAttribute('transform', `translate(${gateX}, ${gateY})`);
      }
      if (sidePusherTopRef.current) {
        const compactProgress =
          phase === 'BLANK_FEED'
            ? Math.min(1, progress / 0.7) * 0.7
            : phase === 'TRANSFER'
              ? 0.7 + Math.min(1, progress / 0.35) * 0.3
              : 0;
        const topPush = compactProgress * 24;
        sidePusherTopRef.current.setAttribute('transform', `translate(${MACHINE_LAYOUT_2D.transfer.x - 10}, ${MACHINE_LAYOUT_2D.glueGuideSpan.topY + topPush})`);
      }
      if (sidePusherBottomRef.current) {
        const compactProgress =
          phase === 'BLANK_FEED'
            ? Math.min(1, progress / 0.7) * 0.7
            : phase === 'TRANSFER'
              ? 0.7 + Math.min(1, progress / 0.35) * 0.3
              : 0;
        const bottomPush = compactProgress * 24;
        sidePusherBottomRef.current.setAttribute('transform', `translate(${MACHINE_LAYOUT_2D.transfer.x - 10}, ${MACHINE_LAYOUT_2D.glueGuideSpan.bottomY + 14 - bottomPush})`);
      }

      if (chainRef.current && (isRunning || sts.machine_state === 'RUN_EMPTY')) {
        chainOffset.current = (chainOffset.current + deltaSeconds * 78) % 60;
        chainRef.current.setAttribute('transform', `translate(${-chainOffset.current}, 0)`);
      }
      if (formationRef.current) {
        const formationVisible = phase === 'CAPTURED' || phase === 'BLANK_FEED' || phase === 'TRANSFER' || phase === 'PACKING';
        formationRef.current.setAttribute('opacity', formationVisible ? '1' : '0');
        if (formationVisible) {
          let fx = formationBaseX;
          let fy = formationBaseY;
          let sy = 1;
          if (phase === 'CAPTURED') {
            fx = formationBaseX + progress * 10;
          } else if (phase === 'BLANK_FEED') {
            fx = formationBaseX + 10 + progress * 12;
          } else if (phase === 'TRANSFER') {
            fx = lerp(formationBaseX + 22, MACHINE_LAYOUT_2D.transfer.x + 32, Math.min(1, progress));
          } else {
            fx = MACHINE_LAYOUT_2D.mainTransport.x - 10 + Math.min(1, progress) * 20;
            const compact = 1;
            sy = lerp(1, 0.86, compact);
            fy += (1 - sy) * 20;
          }
          formationRef.current.setAttribute('transform', `translate(${fx}, ${fy}) scale(1, ${sy})`);
          const nextFormationMarkup = buildFormationMarkup(rowCount, colCount);
          if (formationMarkupRef.current !== nextFormationMarkup) {
            formationRef.current.innerHTML = nextFormationMarkup;
            formationMarkupRef.current = nextFormationMarkup;
          }
        }
      }
      if (packRef.current) {
        const active = (phase === 'TRANSFER' || phase === 'PACKING' || phase === 'DISCHARGE');
        const packOpacity =
          phase === 'TRANSFER'
            ? Math.max(0, (progress - 0.2) / 0.8) * 0.55
            : phase === 'PACKING'
              ? 0.55 + Math.max(0, (progress - 0.15) / 0.85) * 0.45
              : active ? 1 : 0;
        packRef.current.setAttribute('opacity', String(packOpacity));
        if (active) {
            let px = MACHINE_LAYOUT_2D.transfer.centerX;
            let py = packBaseY;
            let formProgress = 0.1;
            let packScaleY = 0.92;
            if (phase === 'PACKING') {
              px = lerp(MACHINE_LAYOUT_2D.mainTransport.x + 22, MACHINE_LAYOUT_2D.glue.x + MACHINE_LAYOUT_2D.glue.width - 10, progress);
              py -= Math.min(1, Math.max(0, (progress - 0.18) / 0.42)) * 2;
              formProgress = Math.min(1, 0.22 + progress * 0.78);
              packScaleY = lerp(0.94, 1, formProgress);
            } else if (phase === 'TRANSFER') {
              px = lerp(MACHINE_LAYOUT_2D.transfer.centerX, MACHINE_LAYOUT_2D.mainTransport.x + 14, progress);
              py = packBaseY + Math.sin(progress * Math.PI) * 2;
              formProgress = Math.min(0.34, progress * 0.34);
            }
            else {
              px = progress < 0.28
                ? MACHINE_LAYOUT_2D.glue.x + 60
                : progress < 0.72
                  ? MACHINE_LAYOUT_2D.glue.x + 60 + ((progress - 0.28) / 0.44) * 96
                  : MACHINE_LAYOUT_2D.discharge.x + ((progress - 0.72) / 0.28) * 38;
              formProgress = 1;
              packScaleY = 1;
              if (progress >= 0.5 && currentDischargeRejectRef.current) {
                py += ((progress - 0.5) / 0.5) * 150;
              }
            }
            packRef.current.setAttribute('transform', `translate(${px}, ${py}) scale(1, ${packScaleY})`);
            const nextMarkup = buildPackMarkup(rowCount, colCount, formProgress);
            if (packInnerMarkupRef.current !== nextMarkup) {
              packRef.current.innerHTML = nextMarkup;
              packInnerMarkupRef.current = nextMarkup;
            }
        }
      }

      if (out.total_product_in > lastProductIn.current) {
        for (let i = lastProductIn.current + 1; i <= out.total_product_in; i++) {
          const positionInPack = (i - 1) % (rowCount * colCount);
          const lane = getLaneIndexForPackPosition(positionInPack, rowCount, laneCapacity);
          const g = document.createElementNS(SVG_NS, "g");
          g.id = `pm-${sessionID.current}-p-${i}`;
          // Use High Contrast product styling: Emerald fill with white stroke
          g.innerHTML = `<circle r="5.4" fill="#10B981" stroke="white" stroke-width="1.2" style="filter: drop-shadow(0 0 2px rgba(16,185,129,0.5))" />`;
          productLayerRef.current.appendChild(g);
          inFlightProducts.current.push({
            id: i,
            pathState: 'INFEED',
            lane,
            positionInPack,
            x: 55,
            y: MACHINE_LAYOUT_2D.infeed.centerY,
            el: g,
          });
        }
        lastProductIn.current = out.total_product_in;
      }

      let previousInfeedX = Number.POSITIVE_INFINITY;

      inFlightProducts.current.forEach((p) => {
        const cY = laneCenters[Math.min(p.lane, laneCenters.length - 1)];
        const queueX = previousInfeedX === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : previousInfeedX - productSpacing;
        
        if (isRunning) {
          switch(p.pathState) {
            case 'INFEED': {
              const activeDividerLane = getLaneIndexForPackPosition(out.grouped_count, rowCount, laneCapacity);
              const canReleaseToDivider =
                p.lane === activeDividerLane &&
                p.x >= meteringStopX &&
                (timestamp - lastDividerReleaseAtRef.current) / 1000 >= releaseIntervalSec;

              const freeFlowTargetX = queueX === Number.POSITIVE_INFINITY ? meteringStopX : Math.min(meteringStopX, queueX);
              p.x = Math.min(freeFlowTargetX, p.x + deltaSeconds * 240);
              p.y = infeedY;

              if (canReleaseToDivider) {
                p.pathState = 'DIVIDING';
                lastDividerReleaseAtRef.current = timestamp;
              }
              break;
            }
            case 'DIVIDING':
              p.x = Math.min(dividerExitX, p.x + deltaSeconds * 180);
              p.y = infeedY + (cY - infeedY) * Math.min(1, (p.x - meteringStopX) / (dividerExitX - meteringStopX));
              if (p.x >= dividerExitX) p.pathState = 'BUFFERED';
              break;
          }
        }
        
        if (p.pathState === 'INFEED') {
          previousInfeedX = p.x;
        }

        if (p.pathState !== 'BUFFERED') {
          p.el.setAttribute('transform', `translate(${p.x}, ${p.y})`);
        }
      });

      // Cleanup products once they have joined the grouped buffer or left the scene
      const remaining = [];
      for (const p of inFlightProducts.current) {
        if (p.pathState === 'BUFFERED' || p.x > 1100) {
          p.el.remove();
        } else {
          remaining.push(p);
        }
      }
      inFlightProducts.current = remaining;

    } catch (e) {
      console.warn("Sim Engine Error - Recovering...", e);
    }

    requestRef.current = requestAnimationFrame(animationLoop);
  }, []);

  // 19: Lifecycle Loop
  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(requestRef.current);
      lastFrameTimeRef.current = null;
    };
  }, [animate]);

  return {
    dividerRef,
    separatorRef,
    stopperRef,
    terminalRef,
    pusherRef,
    gantryRef,
    blankRef,
    chainRef,
    punchRef,
    sidePusherTopRef,
    sidePusherBottomRef,
    productLayerRef,
    formationRef,
    packRef,
  };
}
