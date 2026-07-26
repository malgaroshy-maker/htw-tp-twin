import { useNavigate } from 'react-router-dom';
import { useSimulator } from '../../hooks/useSimulator';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import {
  Play,
  Square,
  RotateCcw,
  Layers,
  Cpu,
  Wrench,
  CheckCircle2,
  XCircle,
  Zap,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';

interface PermissiveRowProps {
  label: string;
  ok: boolean;
  description?: string;
}

function PermissiveRow({ label, ok, description }: PermissiveRowProps) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
      ok ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ok ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`} />
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">{label}</span>
          {description && <p className="text-[9px] text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {ok
        ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
      }
    </div>
  );
}

interface InputToggleProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function InputToggle({ label, value, onChange }: InputToggleProps) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
      value ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-900 border-slate-800'
    }`}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{label}</span>
      <button 
        onClick={() => onChange(!value)}
        className={`w-10 h-5 rounded-full relative transition-all duration-200 cursor-pointer ${
          value ? 'bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-slate-700'
        }`}
      >
        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200 ${
          value ? 'left-6' : 'left-1'
        }`} />
      </button>
    </div>
  );
}

export function Control() {
  const navigate = useNavigate();
  const { state, sendCommand, setInput } = useSimulator();

  if (!state) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Cpu className="w-12 h-12 text-slate-800 animate-pulse mx-auto mb-4" />
          <p className="text-slate-500 font-mono uppercase tracking-widest text-xs">Connecting to Controller...</p>
        </div>
      </div>
    );
  }

  const { sts, hmi, out, inputs, sns } = state;
  const isRunning = ['RUNNING', 'STARTING', 'RUN_EMPTY', 'STARVED', 'BLOCKED'].includes(sts.machine_state);
  const isAuto = sts.machine_mode === 'AUTO';
  const isManual = sts.machine_mode === 'MANUAL';

  const lampColors: Record<string, string> = {
    green:  'bg-emerald-500 shadow-emerald-500/50',
    red:    'bg-red-500 shadow-red-500/50',
    yellow: 'bg-amber-400 shadow-amber-400/50',
    blue:   'bg-blue-400 shadow-blue-400/50',
    purple: 'bg-purple-400 shadow-purple-400/50',
    gray:   'bg-slate-600',
  };

  return (
    <div className="flex-1 flex flex-col p-8 gap-8 w-full bg-slate-950 overflow-y-auto">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-6 mb-2">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/20 p-3 rounded-xl border border-blue-500/30">
            <Cpu className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white">Machine Control</h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">
              PLC Commands · Mode Selection · Permissive Status
            </p>
          </div>
        </div>

        {/* Status Lamp */}
        <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 px-5 py-3 rounded-2xl">
          <div className={`w-4 h-4 rounded-full shadow-lg animate-pulse ${lampColors[hmi.status_lamp_color] ?? 'bg-slate-600'}`} />
          <span className="text-xs font-black text-slate-200 uppercase tracking-widest">{sts.machine_state}</span>
        </div>
      </header>

      {/* Footer Message Banner */}
      {hmi.footer_message && (
        <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border text-sm font-bold uppercase tracking-wider ${
          sts.fault_active
            ? 'bg-red-500/10 border-red-500/30 text-red-300'
            : sts.warning_active
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'bg-slate-800/60 border-slate-700 text-slate-300'
        }`}>
          <Zap className="w-4 h-4 flex-shrink-0" />
          {hmi.footer_message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* === LEFT: Main Machine Commands === */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <Card title="Machine Commands" className="border-slate-800/50 bg-slate-900/40">
            <div className="flex flex-col gap-3">
              <Button
                id="btn-start"
                variant="primary"
                size="lg"
                className="w-full py-5 font-black uppercase tracking-widest text-base shadow-lg shadow-emerald-500/20"
                disabled={!hmi.start_button_enabled}
                onClick={() => sendCommand('start')}
              >
                <Play className="w-5 h-5 fill-current mr-2" /> Start
              </Button>

              <Button
                id="btn-stop"
                variant="secondary"
                size="lg"
                className="w-full py-5 font-black uppercase tracking-widest text-base"
                disabled={!hmi.stop_button_enabled}
                onClick={() => sendCommand('stop')}
              >
                <Square className="w-5 h-5 fill-current mr-2" /> Stop
              </Button>

              <Button
                id="btn-reset"
                variant="danger"
                size="lg"
                className="w-full py-5 font-black uppercase tracking-widest text-base"
                disabled={!hmi.reset_button_enabled}
                onClick={() => sendCommand('reset')}
              >
                <RotateCcw className="w-5 h-5 mr-2" /> Reset
              </Button>

              <div className="h-px bg-slate-800 my-1" />

              <Button
                id="btn-run-empty"
                variant="ghost"
                size="md"
                className="w-full justify-between border border-purple-500/20 text-purple-400 hover:bg-purple-500/10 font-black uppercase"
                disabled={!hmi.stop_button_enabled}
                onClick={() => sendCommand('run_empty')}
              >
                <span className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" /> Run Empty
                </span>
                <Badge variant="neutral" className="text-[9px]">PURGE</Badge>
              </Button>

              <Button
                id="btn-refill-blanks"
                variant="ghost"
                size="md"
                className="w-full justify-between border border-amber-500/20 text-amber-400 hover:bg-amber-500/10 font-black uppercase"
                onClick={() => sendCommand('refill_blanks')}
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Refill Blanks
                </span>
                <span className="text-xs font-mono text-slate-400">{out.blanks_remaining}</span>
              </Button>
            </div>
          </Card>

          {/* Mode Selection */}
          <Card title="Operating Mode" className="border-slate-800/50 bg-slate-900/40">
            <div className="flex flex-col gap-3">
              <button
                id="btn-mode-auto"
                disabled={!hmi.auto_mode_enabled}
                onClick={() => sendCommand('mode_auto')}
                className={`w-full flex items-center justify-between px-4 py-4 rounded-xl border font-black text-sm uppercase tracking-widest transition-all ${
                  isAuto
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                    : hmi.auto_mode_enabled
                    ? 'border-slate-700 text-slate-400 hover:bg-blue-500/5 hover:border-blue-500/30 hover:text-blue-300'
                    : 'border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                }`}
              >
                <span className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isAuto ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`} />
                  Auto Mode
                </span>
                {isAuto && <Badge variant="info" className="text-[9px]">ACTIVE</Badge>}
              </button>

              <button
                id="btn-mode-manual"
                disabled={!hmi.manual_mode_enabled}
                onClick={() => sendCommand('mode_manual')}
                className={`w-full flex items-center justify-between px-4 py-4 rounded-xl border font-black text-sm uppercase tracking-widest transition-all ${
                  isManual
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                    : hmi.manual_mode_enabled
                    ? 'border-slate-700 text-slate-400 hover:bg-amber-500/5 hover:border-amber-500/30 hover:text-amber-300'
                    : 'border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Wrench className="w-4 h-4" />
                  Manual Mode
                </span>
                {isManual && <Badge variant="warning" className="text-[9px]">ACTIVE</Badge>}
              </button>

              {!isAuto && !isRunning && (
                <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mt-1 text-center">
                  ⚠ Auto mode required to start the machine
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* === CENTER: Permissive Status === */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <Card title="Start Permissives" className="border-slate-800/50 bg-slate-900/40">
            <div className="flex flex-col gap-2">
              <div className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 mb-2 ${
                sts.start_permissive_ok ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-red-500/10 border-red-500/40'
              }`}>
                <span className="text-sm font-black uppercase tracking-widest text-slate-200">
                  Permissive Chain
                </span>
                <Badge variant={sts.start_permissive_ok ? 'success' : 'danger'} className="text-[10px] font-black">
                  {sts.start_permissive_ok ? 'ALL OK ✓' : 'BLOCKED ✗'}
                </Badge>
              </div>

              <PermissiveRow
                label="Auto Mode"
                ok={sts.machine_mode === 'AUTO'}
                description="Machine must be in AUTO before starting"
              />
              <PermissiveRow
                label="No Active Fault"
                ok={!sts.fault_active}
                description="Latched faults must be reset"
              />
              <PermissiveRow
                label="Safety Chain"
                ok={inputs['safety_ok'] === true}
                description="All safety devices enabled"
              />
              <PermissiveRow
                label="E-Stop OK"
                ok={inputs['estop_ok'] === true}
                description="Emergency stop not activated"
              />
              <PermissiveRow
                label="Guards Closed"
                ok={inputs['guards_closed'] === true}
                description="All guarding must be closed"
              />
              <PermissiveRow
                label="Utilities OK"
                ok={inputs['utilities_ok'] === true}
                description="Air, power, vacuum OK"
              />
              <PermissiveRow
                label="Blanks Available"
                ok={inputs['blank_available'] === true}
                description="Tray magazine must have stock"
              />
              <PermissiveRow
                label="Transfer Gap Clear"
                ok={sns.transfer_gap_clear === true}
                description="No product in transfer zone"
              />
              <PermissiveRow
                label="Tray Stack Present"
                ok={sns.tray_stack_present === true}
                description="Tray magazine level sensor OK"
              />
            </div>
          </Card>
        </div>

        {/* === RIGHT: Session Actions + Training Link === */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          {/* Live Counters */}
          <Card title="Session Overview" className="border-slate-800/50 bg-slate-900/40">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Good Packs', value: out.good_pack_count, color: 'text-emerald-400' },
                { label: 'Rejects', value: out.reject_pack_count, color: 'text-red-400' },
                { label: 'Cycles', value: out.cycle_count, color: 'text-blue-400' },
                { label: 'Blanks Left', value: out.blanks_remaining, color: 'text-amber-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/40">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
                  <p className={`text-2xl font-black font-mono ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span className="font-mono">Runtime</span>
                <span className="font-black text-slate-300 font-mono">{Math.floor(out.runtime_sec)}s</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
                <span className="font-mono">Downtime</span>
                <span className="font-black text-slate-300 font-mono">{Math.floor(out.downtime_sec)}s</span>
              </div>
            </div>
          </Card>

          {/* Reject Bin */}
          <Card title="Reject Bin" className="border-slate-800/50 bg-slate-900/40">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Accumulation</span>
                <span className={`font-black text-sm font-mono ${
                  out.reject_accumulation_count >= 3 ? 'text-red-400' :
                  out.reject_accumulation_count === 2 ? 'text-amber-400' : 'text-slate-400'
                }`}>
                  {out.reject_accumulation_count} / 3
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    out.reject_accumulation_count >= 3 ? 'bg-red-500' :
                    out.reject_accumulation_count === 2 ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${(out.reject_accumulation_count / 3) * 100}%` }}
                />
              </div>
              <Button
                id="btn-clear-rejects"
                variant="secondary"
                size="sm"
                className="w-full"
                disabled={out.reject_accumulation_count === 0}
                onClick={() => sendCommand('clear_rejects')}
              >
                Clear Reject Bin
              </Button>
            </div>
          </Card>

          {/* Maintenance Mode Panel (Only in MANUAL) */}
          {isManual && (
            <div className="xl:col-span-1 border-2 border-amber-500/30 rounded-3xl p-6 bg-amber-500/5 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header className="flex items-center gap-3">
                <div className="bg-amber-500/20 p-2 rounded-lg">
                  <Wrench className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest">Maintenance Mode</h3>
                  <p className="text-[9px] text-amber-600/80 font-bold uppercase tracking-tighter">Manual Overrides & Jog Controls</p>
                </div>
              </header>

              <div className="space-y-4">
                <section>
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Zap className="w-3 h-3" /> Field Input Overrides
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    <InputToggle 
                      label="Product Feed" 
                      value={!!inputs.product_available} 
                      onChange={(v) => setInput('product_available', v)} 
                    />
                    <InputToggle 
                      label="Blank Magazine" 
                      value={!!inputs.blank_available} 
                      onChange={(v) => setInput('blank_available', v)} 
                    />
                    <InputToggle 
                      label="Downstream OK" 
                      value={!!inputs.downstream_available} 
                      onChange={(v) => setInput('downstream_available', v)} 
                    />
                    <div className="h-px bg-slate-800/50 my-1" />
                    <InputToggle 
                      label="Safety Chain" 
                      value={!!inputs.safety_ok} 
                      onChange={(v) => setInput('safety_ok', v)} 
                    />
                    <InputToggle 
                      label="E-Stop OK" 
                      value={!!inputs.estop_ok} 
                      onChange={(v) => setInput('estop_ok', v)} 
                    />
                    <InputToggle 
                      label="Guards Closed" 
                      value={!!inputs.guards_closed} 
                      onChange={(v) => setInput('guards_closed', v)} 
                    />
                    <InputToggle 
                      label="Utilities OK" 
                      value={!!inputs.utilities_ok} 
                      onChange={(v) => setInput('utilities_ok', v)} 
                    />
                  </div>
                </section>

                <section>
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ArrowRight className="w-3 h-3" /> Manual Jog Commands
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-[10px] font-black uppercase text-amber-500 hover:bg-amber-500/10 border-amber-500/20"
                      onClick={() => sendCommand('jog_infeed')}
                    >
                      Jog Infeed Belt
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-[10px] font-black uppercase text-amber-500 hover:bg-amber-500/10 border-amber-500/20"
                      onClick={() => sendCommand('jog_blank_feed')}
                    >
                      Fire Blank Feed
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-[10px] font-black uppercase text-amber-500 hover:bg-amber-500/10 border-amber-500/20"
                      onClick={() => sendCommand('jog_pack_advance')}
                    >
                      Advance Pack Step
                    </Button>
                  </div>
                </section>
              </div>

              <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/20">
                <p className="text-[10px] text-amber-200/60 leading-relaxed italic">
                  ⚠ In Manual Mode, automatic production is inhibited. Jog commands bypass the state machine logic for maintenance testing.
                </p>
              </div>
            </div>
          )}

          {/* Training Link */}
          {!isManual && (
            <button
              onClick={() => navigate('/training')}
              className="flex items-center justify-between px-5 py-4 bg-indigo-500/5 border border-indigo-500/20 hover:bg-indigo-500/10 hover:border-indigo-500/40 rounded-2xl transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
                <div>
                  <p className="text-sm font-black text-indigo-300 uppercase tracking-wider">Training Scenarios</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Fault injection & operator drills</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
