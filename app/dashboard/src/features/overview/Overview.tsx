import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSimulator } from '../../hooks/useSimulator';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { AiPanel } from '../../components/AiPanel';
import { ReportViewer } from '../../components/ReportViewer';
import { ScenarioSelector } from '../../components/ScenarioSelector';
import { SimulationView2D } from '../simulation/SimulationView2D';
import { 
  Play, 
  Square, 
  AlertTriangle, 
  Activity, 
  Bot, 
  FileText, 
  RefreshCw,
  Layers,
  Cpu
} from 'lucide-react';

export function Overview() {
  const { 
    state, 
    scenarios,
    activeReport,
    setActiveReport,
    aiResponse,
    sendCommand,
    resetSession,
    startScenario,
    stopScenario,
    fetchReport,
    askAi
  } = useSimulator();

  const [isAiOpen, setIsAiOpen] = useState(false);
  const navigate = useNavigate();

  if (!state) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Activity className="w-12 h-12 text-slate-800 animate-pulse mx-auto mb-4" />
          <p className="text-slate-500 font-mono uppercase tracking-widest">Connecting to Simulator...</p>
        </div>
      </div>
    );
  }

  const { sts, out, fault, cfg, hmi, plc } = state;
  const isFaulted = sts.machine_state === 'FAULTED';
  const isRunning = sts.machine_state === 'RUNNING';
  const isStopped = sts.machine_state === 'STOPPED';
  const isWarning = sts.fault_active && (fault.active_severity === 'WARNING' || out.reject_accumulation_count === 2);
  const isRejectBinFull = out.reject_accumulation_count >= 3;
  const commsHealthy = plc?.comms_healthy ?? true;

  const handleCommand = (action: string) => {
    sendCommand(action);
  };

  const getStateVariant = (s: string) => {
    switch (s) {
      case 'RUNNING': return 'success';
      case 'STARTING': return 'info';
      case 'FAULTED': return 'danger';
      case 'STARVED': return 'warning';
      case 'BLOCKED': return 'warning';
      case 'RUN_EMPTY': return 'neutral';
      default: return 'default';
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 gap-8 w-full bg-slate-950">
      <ReportViewer report={activeReport} onClose={() => setActiveReport(null)} />
      <AiPanel 
        isOpen={isAiOpen} 
        onClose={() => setIsAiOpen(false)} 
        response={aiResponse}
        onAsk={askAi}
        hasFault={sts.fault_active}
      />

      {/* Header - Industrial Technical Look */}
      <header className="flex items-center justify-between bg-slate-900/40 p-6 rounded-2xl border border-slate-800/50 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="bg-gradient-to-br from-indigo-500 to-emerald-500 p-0.5 rounded-xl">
            <div className="bg-slate-950 p-3 rounded-[10px]">
              <Cpu className="w-6 h-6 text-emerald-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black uppercase tracking-tight text-white leading-none">Tray Packer <span className="text-emerald-500">HMI</span></h1>
              <div className="flex gap-2">
                <Badge variant={getStateVariant(sts.machine_state)} className="px-3 py-1 text-[10px] uppercase font-black tracking-widest leading-none flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isFaulted ? 'bg-red-400 animate-pulse' : isWarning ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 opacity-20'}`} />
                  {sts.machine_state}
                </Badge>
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 rounded-lg border border-slate-800 shadow-inner">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                    {sts.machine_mode}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.4em] mt-3">Digital Twin / Real-time Telemetry System / v2.0-STABLE</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {/* PLC Comms Health — subtle, secondary to machine state */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800">
            <div className={`w-2 h-2 rounded-full ${commsHealthy ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${commsHealthy ? 'text-slate-600' : 'text-red-500'}`}>
              PLC {commsHealthy ? 'OK' : 'LOST'}
            </span>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Diagnostic Status</span>
            <div className="flex gap-2 text-[10px] font-black uppercase tracking-tight">
              {isFaulted && <span className="text-red-500 animate-pulse">LATCHED FAULT</span>}
              {isWarning && !isFaulted && <span className="text-amber-500">OPERATOR WARNING</span>}
              {isStopped && !isFaulted && !isWarning && <span className="text-slate-500 font-mono">SYSTEM IDLE</span>}
              {!isFaulted && !isWarning && !isStopped && <span className="text-emerald-500">SYSTEM HEALTHY</span>}
            </div>
          </div>
          <div className="w-[1px] h-10 bg-slate-800/50" />
          <div className="flex flex-col items-end">
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Efficiency</div>
            <div className="text-xl font-hmi font-black text-white leading-none">94.2%</div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <Button variant="ghost" size="sm" onClick={resetSession} className="bg-slate-950 border border-slate-800 h-9 w-9 p-0">
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </Button>
            <Button variant="ghost" size="sm" onClick={fetchReport} className="bg-slate-950 border border-slate-800 h-9 w-9 p-0">
              <FileText className="w-4 h-4 text-slate-400" />
            </Button>
            <Button variant={isAiOpen ? 'primary' : 'secondary'} size="sm" onClick={() => setIsAiOpen(!isAiOpen)} className="ml-2 px-4 shadow-lg shadow-indigo-500/10">
              <Bot className="w-4 h-4 mr-2" /> AI CO-PILOT
            </Button>
          </div>
        </div>
      </header>

      {/* Warning Banner (Yellow) — machine can continue, operator should respond soon */}
      {sts.warning_active && !sts.fault_active && (
        <div 
          className="flex items-center justify-between p-5 rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 text-amber-200 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500"
        >
          <div className="flex items-center gap-5">
            <div className="p-3 rounded-xl bg-amber-500 shadow-lg shadow-amber-500/40">
              <AlertTriangle className="w-6 h-6 text-black" />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-[0.1em]">Warning: {state?.warn?.active_code || 'Condition Detected'}</h4>
              <p className="text-base font-semibold opacity-80">{state?.warn?.active_text || 'Operator attention required'}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider self-center">Machine Running — Monitor Condition</span>
          </div>
        </div>
      )}

      {/* Fault Banner (Red) — machine stopped, reset required */}
      {sts.fault_active && (
        <div 
          className="flex items-center justify-between p-5 rounded-2xl border-2 border-red-500/50 bg-red-500/10 text-red-200 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500"
        >
          <div className="flex items-center gap-5">
            <div className="p-3 rounded-xl bg-red-500 shadow-lg shadow-red-500/40">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-[0.1em]">Fault: {fault.active_code}</h4>
              <p className="text-base font-semibold opacity-80">{fault.active_text}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={() => navigate('/faults')}>Diagnostics</Button>
            {hmi.reset_button_enabled && (
              <Button variant="danger" size="lg" className="font-black" onClick={() => sendCommand('reset')}>RESET SYSTEM</Button>
            )}
          </div>
        </div>
      )}

      {/* Main Layout Grid - 12 Column for finer control */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 flex-1">
        
        {/* HERO: 2D Simulation */}
        <div className="lg:col-span-9 flex flex-col gap-6 h-full min-h-[580px]">
          <div className="flex-1 bg-slate-950/80 border border-slate-800/80 rounded-3xl p-10 relative overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]">
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px]" />
            <div className="absolute top-6 left-10 z-10 flex items-center gap-3">
              <div className="flex gap-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-1 h-3 bg-emerald-500/40 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-slate-400">Live Machine Telemetry Stream</span>
            </div>

            <div className="absolute right-8 top-8 z-10 rounded-2xl border border-emerald-500/20 bg-slate-950/80 p-4 backdrop-blur-md">
              <div className="text-[9px] font-black uppercase tracking-[0.26em] text-emerald-300">3D Workspace</div>
              <div className="mt-2 text-sm font-semibold text-white">Standalone Viewer Available</div>
              <p className="mt-2 max-w-[220px] text-xs leading-5 text-slate-300">
                Use `/3dsim` for orbit camera, presets, layers, and fullscreen machine inspection.
              </p>
              <Link
                to="/3dsim"
                className="mt-4 inline-flex items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200 transition hover:bg-emerald-500/30 hover:text-white"
              >
                Open 3D Viewer
              </Link>
            </div>

            <SimulationView2D state={state} />
          </div>
        </div>

        {/* SIDEBAR: Controls & Technical Data - Spans 3 columns */}
        <div className="lg:col-span-3 flex flex-col gap-6 overflow-y-auto pr-2">
          
          {/* Quick Stats Sidebar Integration */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-slate-900/60 border border-slate-800/50 p-3 rounded-xl flex flex-col">
                <span className="text-[8px] font-hmi text-slate-500 uppercase tracking-widest">Efficiency</span>
                <span className="text-lg font-black text-emerald-400 font-mono">98.2%</span>
             </div>
             <div className="bg-slate-900/60 border border-slate-800/50 p-3 rounded-xl flex flex-col">
                <span className="text-[8px] font-hmi text-slate-500 uppercase tracking-widest">Cycle Time</span>
                <span className="text-lg font-black text-slate-100 font-mono">{out.last_cycle_time_sec.toFixed(2)}s</span>
             </div>
             <div className="bg-slate-900/60 border border-slate-800/50 p-3 rounded-xl flex flex-col">
                <span className="text-[8px] font-hmi text-slate-500 uppercase tracking-widest">Infeed Rate</span>
                <span className="text-lg font-black text-sky-400 font-mono">{(60 / cfg.nominal_cycle_time_sec).toFixed(1)}/m</span>
             </div>
             <div className="bg-slate-900/60 border border-slate-800/50 p-3 rounded-xl flex flex-col">
                <span className="text-[8px] font-hmi text-slate-500 uppercase tracking-widest">MTBF</span>
                <span className="text-lg font-black text-amber-500 font-mono">14.2h</span>
             </div>
          </div>
          <Card title="Operator Interface" className="border-slate-800/50 bg-[#0C1118]">
            <div className="flex flex-col gap-4">
              <Button 
                variant={isRunning ? 'secondary' : 'primary'} 
                size="lg" 
                className={`w-full py-6 font-black uppercase tracking-widest text-lg ${isRunning ? '' : 'shadow-lg shadow-emerald-500/20'}`}
                disabled={!hmi.start_button_enabled && !isRunning}
                onClick={() => sendCommand('start')}
              >
                <Play className="w-5 h-5 fill-current mr-2" /> Start
              </Button>
              <Button 
                variant="secondary" 
                size="lg" 
                className="w-full py-6 font-black uppercase tracking-widest text-lg"
                disabled={!hmi.stop_button_enabled}
                onClick={() => sendCommand('stop')}
              >
                <Square className="w-5 h-5 fill-current mr-2" /> Stop
              </Button>

              <div className="h-px bg-slate-800/50 my-2" />
              
              <Button 
                variant="ghost" 
                size="md" 
                className="w-full justify-between px-4 text-amber-500 border border-amber-500/20 hover:bg-amber-500/10"
                onClick={() => sendCommand('refill_blanks')}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase">Refill Blanks</span>
                </div>
                <span className="text-xs font-mono">{out.blanks_remaining}</span>
              </Button>
            </div>
          </Card>

          {/* KPI Dashboard */}
          <Card title="Process KPI" className="border-slate-800/50 bg-[#0C1118]">
            <div className="flex flex-col gap-6 py-2">
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[10px] font-hmi text-slate-500 uppercase tracking-widest">Quality Yield</span>
                  <span className="text-xs font-bold text-emerald-500 uppercase">Good Packs</span>
                </div>
                <span className="text-4xl font-black text-slate-100 font-mono leading-none tracking-tighter">{out.good_pack_count}</span>
              </div>
              <div className="h-px bg-slate-800/50" />
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[10px] font-hmi text-slate-500 uppercase tracking-widest">Rejection Rate</span>
                  <span className="text-xs font-bold text-red-500 uppercase">Waste</span>
                </div>
                <span className="text-4xl font-black text-red-500 font-mono leading-none tracking-tighter">{out.reject_pack_count}</span>
              </div>
            </div>
          </Card>
          
          <ScenarioSelector 
            scenarios={scenarios} 
            activeScenarioId={cfg.active_scenario_id}
            activeScenarioStatus={cfg.active_scenario_status}
            onStart={startScenario}
            onStop={stopScenario}
          />

          {/* REJECT BIN CLEARANCE */}
          <div className="bg-slate-900/80 border border-slate-700/50 p-4 rounded-2xl flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reject Bin Status</span>
              <span className={`text-[10px] font-black font-hmi px-2 py-0.5 rounded ${out.reject_accumulation_count >= 3 ? 'bg-red-500/20 text-red-500' : out.reject_accumulation_count === 2 ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-800 text-slate-500'}`}>
                {out.reject_accumulation_count}/3 PACKS
              </span>
            </div>
            
            <button
              onClick={() => handleCommand('clear_rejects')}
              disabled={out.reject_accumulation_count === 0}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-hmi font-black text-xs uppercase transition-all
                ${out.reject_accumulation_count > 0 
                  ? 'bg-amber-500 text-black hover:bg-amber-400 active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Reject Bin
            </button>
            
            {isRejectBinFull && (
              <p className="text-[10px] text-red-500 font-bold leading-tight animate-pulse">
                 Machine forced to FAULT. Clear bin to allow Reset.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Industrial Hardware Status Footer */}
      <footer className="mt-auto pt-8 border-t border-slate-900 flex justify-between items-center text-slate-600">
        <div className="flex gap-8">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-hmi uppercase tracking-[0.2em]">System Uptime</span>
            <span className="text-xs font-mono text-slate-400">T+{Math.floor(out.runtime_sec)}s</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-hmi uppercase tracking-[0.2em]">Machine ID</span>
            <span className="text-xs font-mono text-slate-400">TP-KOL-77</span>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-slate-900/30 px-6 py-2 rounded-full border border-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-hmi font-bold uppercase tracking-widest">Telemetry Stream Active</span>
          </div>
          <span className="text-[10px] font-mono opacity-40">SEQ_{Math.floor(Date.now()/1000).toString(16).toUpperCase()}</span>
        </div>
      </footer>
    </div>
  );
}
