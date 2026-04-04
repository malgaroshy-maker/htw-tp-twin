import { useEffect, useState } from 'react';
import { MachineBed } from './components/topdown/MachineBed';
import { SensorLED } from './components/topdown/SensorLED';
import { InfeedDivider } from './components/topdown/InfeedDivider';
import { GroupingLanes } from './components/topdown/GroupingLanes';
import { GroupedBuffer } from './components/topdown/GroupedBuffer';
import { TransferPusher } from './components/topdown/TransferPusher';
import { ProductStream } from './components/topdown/ProductStream';
import { BlankFeeder } from './components/topdown/BlankFeeder';
import { FormingChain } from './components/topdown/FormingChain';
import { RejectPunch } from './components/topdown/RejectPunch';
import { Pack } from './components/Pack';
import { useMachineAnimation } from './hooks/useMachineAnimation';
import { MACHINE_LAYOUT_2D } from './machineLayout';
import './simulation.css';

interface TransientPack {
  id: string;
  type: 'good' | 'reject';
  spawnTime: number;
  rows: number;
  cols: number;
}

interface SimulationView2DProps {
  state: any;
}

export function SimulationView2D({ state }: SimulationView2DProps) {
  const [transientPacks, setTransientPacks] = useState<TransientPack[]>([]);

  const {
    dividerRef, separatorRef, stopperRef, terminalRef, pusherRef,
    gantryRef, blankRef, chainRef, punchRef,
    sidePusherTopRef, sidePusherBottomRef,
    productLayerRef, formationRef, packRef
  } = useMachineAnimation(state);

  useEffect(() => {
    if (!state?.evt?.last_event_code) return;
    const evtCode = state.evt.last_event_code;
    const evtTs = state.evt.last_event_ts;
    if (evtCode === 'PACK_GOOD_DISCHARGED' || evtCode === 'PACK_REJECT_DIVERTED') {
      const type = evtCode === 'PACK_GOOD_DISCHARGED' ? 'good' : 'reject';
      setTransientPacks(prev => {
        if (prev.some(p => p.id === evtTs?.toString())) return prev;
        return [...prev, {
          id: evtTs?.toString() || Date.now().toString(), type, spawnTime: Date.now(),
          rows: state.cfg?.grid_rows || 3, cols: state.cfg?.grid_cols || 3
        }];
      });
    }
  }, [state?.evt?.last_event_ts, state]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setTransientPacks(prev => prev.filter(p => now - p.spawnTime < 5000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!state) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900/20 rounded-3xl border border-white/5">
        <div className="text-slate-500 font-mono text-[10px] animate-pulse uppercase tracking-[0.3em]">Awaiting Simulation Data...</div>
      </div>
    );
  }

  const { sts, out, sns } = state;
  const { separator, grouping, mainTransport, discharge, blankTransport } = MACHINE_LAYOUT_2D;

  return (
    <div className="relative w-full h-full min-h-[580px] flex items-center justify-center p-4 bg-[#020617] rounded-3xl overflow-hidden shadow-2xl border border-white/5">
      <svg
        viewBox="0 0 1000 600"
        className="w-full h-full max-h-[600px] select-none pointer-events-none"
        preserveAspectRatio="xMidYMid meet"
        style={{ isolation: 'isolate' }}
      >
        <defs>
          <linearGradient id="mechanical-metallic" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#475569" /><stop offset="50%" stopColor="#94A3B8" /><stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <linearGradient id="product-metallic" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10B981" /><stop offset="50%" stopColor="#34D399" /><stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <MachineBed />

        <ProductStream productLayerRef={productLayerRef} formationRef={formationRef} packRef={packRef} />
        <GroupedBuffer
          groupedCount={['CAPTURED', 'TRANSFER', 'PACKING', 'DISCHARGE'].includes(sts?.cycle_phase) ? 0 : (out?.grouped_count || 0)}
          rows={state.cfg?.grid_rows || 3}
          cols={state.cfg?.grid_cols || 3}
        />

        <InfeedDivider dividerRef={dividerRef} separatorRef={separatorRef} />
        <GroupingLanes stopperRef={stopperRef} terminalRef={terminalRef} />
        <TransferPusher pusherRef={pusherRef} />

        <BlankFeeder gantryRef={gantryRef} blankRef={blankRef} stackCount={out?.blanks_remaining || 0} />
        <FormingChain
          chainRef={chainRef}
          sidePusherTopRef={sidePusherTopRef}
          sidePusherBottomRef={sidePusherBottomRef}
          active={sts?.cycle_phase === 'PACKING' || sts?.cycle_phase === 'DISCHARGE'}
        />
        <RejectPunch punchRef={punchRef} rejectCount={out?.reject_accumulation_count || 0} />

        <g className="sensors" filter="url(#glow)">
          <SensorLED x={separator.x - 12} y={separator.y - 28} active={sns?.divider_gap_clear} label="DIV_GAP" labelPosition="top" />
          <SensorLED x={grouping.clampX} y={grouping.y - 18} active={sns?.stopper_closed} label="CLAMP" labelPosition="top" />
          <SensorLED x={grouping.chainStopX} y={grouping.y + grouping.height + 20} active={sns?.terminal_closed} label="CHAIN STOP" labelPosition="bottom" />
          <SensorLED x={blankTransport.x + 160} y={blankTransport.y - 18} active={sns?.tray_positioned} label="BLANK POS" labelPosition="top" />
          <SensorLED x={mainTransport.x + 56} y={mainTransport.y - 18} active={sns?.chain_clear} label="CHAIN CLR" labelPosition="top" />
          <SensorLED x={discharge.x + 26} y={discharge.y - 18} active={sns?.outlet_sensor_ok} label="OUTLET" labelPosition="top" />
        </g>

        {transientPacks.map(tp => (
          <g
            key={tp.id}
            className={tp.type === 'good' ? 'animate-pack-good' : 'animate-pack-reject'}
            transform={`translate(${tp.type === 'good' ? 860 : MACHINE_LAYOUT_2D.reject.x + 6}, ${tp.type === 'good' ? 284 : MACHINE_LAYOUT_2D.reject.y - 4})`}
          >
            <Pack rows={tp.rows} cols={tp.cols} />
          </g>
        ))}
      </svg>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none bg-slate-900/90 border border-slate-700/50 p-1.5 rounded-xl backdrop-blur-md">
        {['IDLE', 'GROUPING', 'CAPTURED', 'BLANK_FEED', 'TRANSFER', 'PACKING', 'DISCHARGE'].map((ph) => (
          <div key={ph} className={`px-2.5 py-1 rounded text-[9px] font-black uppercase transition-all duration-300 ${sts?.cycle_phase === ph ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-600'}`}>
            {ph.replace('_', ' ')}
          </div>
        ))}
      </div>
    </div>
  );
}
