import { useState } from 'react';
import { useSimulator } from '../../hooks/useSimulator';
import type { SimulatorState } from '../../hooks/simTypes';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import {
  Activity,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Package,
  Layers,
  ArrowRightLeft,
  ArrowRight,
  Settings,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wrench,
  MoveRight,
  GripVertical,
  ArrowDownUp,
  Box,
  ScanEye,
  ChevronDown,
  ChevronUp,
  Code,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

function SensorPill({ label, value, icon, invert }: { label: string; value: boolean; icon: React.ReactNode; invert?: boolean }) {
  const isActive = invert ? !value : value;
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
      isActive
        ? 'bg-emerald-500/5 border-emerald-500/20'
        : 'bg-red-500/5 border-red-500/20'
    }`}>
      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-red-400'} ${!isActive ? 'animate-pulse' : ''}`} />
      <span className={`text-[9px] font-bold uppercase tracking-wider flex-1 truncate ${isActive ? 'text-emerald-400' : 'text-red-400'}`}>
        {label}
      </span>
      <span className={isActive ? 'text-emerald-500/60' : 'text-red-500/60'}>{icon}</span>
    </div>
  );
}

interface DiagIndicatorProps {
  label: string;
  value: boolean;
  icon: React.ReactNode;
  onToggle?: (val: boolean) => void;
  devMode?: boolean;
}

function DiagIndicator({ label, value, icon, onToggle, devMode }: DiagIndicatorProps) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
      value
        ? 'bg-emerald-500/5 border-emerald-500/20'
        : 'bg-red-500/5 border-red-500/20'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${value ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          {icon}
        </div>
        <div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <div className={`w-2 h-2 rounded-full ${value ? 'bg-emerald-400' : 'bg-red-400'} ${!value ? 'animate-pulse' : ''}`} />
            <span className={`text-sm font-bold uppercase tracking-wide ${value ? 'text-emerald-400' : 'text-red-400'}`}>
              {value ? 'OK' : 'NOT OK'}
            </span>
          </div>
        </div>
      </div>
      {devMode && onToggle && (
        <button
          onClick={() => onToggle(!value)}
          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
            value
              ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-slate-800 hover:border-slate-700 hover:text-slate-400'
          }`}
        >
          {value ? 'Disable' : 'Enable'}
        </button>
      )}
    </div>
  );
}

export function Diagnostics() {
  const { state, setInput } = useSimulator();
  const [devMode, setDevMode] = useState(false);
  const [showPlcDebug, setShowPlcDebug] = useState(false);

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

  const { inputs, sts, hmi, fault, cfg, out } = state;

  // PLC code mappings (mirrors plc_mapping.py constants)
  const PLC_STATE_CODES: Record<string, number> = {
    STOPPED: 0, STARTING: 1, RUNNING: 2, STARVED: 3, BLOCKED: 4, FAULTED: 5, RUN_EMPTY: 6,
  };
  const PLC_PHASE_CODES: Record<string, number> = {
    IDLE: 0, GROUPING: 1, CAPTURED: 2, BLANK_FEED: 3, TRANSFER: 4, PACKING: 5, DISCHARGE: 6,
  };
  const PLC_MODE_CODES: Record<string, number> = { AUTO: 0, MANUAL: 1 };
  const PLC_FAULT_CODES: Record<string, number> = {
    '': 0, STARVATION: 1, DOWNSTREAM_BLOCK: 2, BLANK_MISSING: 3, GAP_CONTROL_JAM: 4,
    INCOMPLETE_PACK: 5, OPEN_FLAP: 6, REJECT_BIN_FULL: 7, REJECT_BIN_NEAR_FULL: 8, TRANSPORT_CHAIN_GAP: 9,
  };
  const PLC_WARN_CODES: Record<string, number> = { '': 0, BLANK_LOW: 1, BLANK_EMPTY: 2 };
  const PLC_RECIPE_CODES: Record<string, number> = { '21-pack': 0, '24-pack': 1, '27-pack': 2, '30-pack': 3 };
  const PLC_REJECT_CODES: Record<string, number> = { '': 0, INCOMPLETE_PACK: 1, OPEN_FLAP: 2 };
  type SensorKey = keyof SimulatorState['sns'];

  const safetyInputs = [
    { key: 'safety_ok', label: 'Safety Chain', icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> },
    { key: 'estop_ok', label: 'E-Stop Clear', icon: <ShieldAlert className="w-4 h-4 text-emerald-400" /> },
    { key: 'guards_closed', label: 'Guards Closed', icon: <Shield className="w-4 h-4 text-emerald-400" /> },
    { key: 'utilities_ok', label: 'Utilities OK', icon: <Zap className="w-4 h-4 text-emerald-400" /> },
  ];

  const materialInputs = [
    { key: 'product_available', label: 'Product Available', icon: <Package className="w-4 h-4 text-sky-400" /> },
    { key: 'blank_available', label: 'Blank Available', icon: <Layers className="w-4 h-4 text-amber-400" /> },
    { key: 'downstream_available', label: 'Downstream Free', icon: <ArrowRightLeft className="w-4 h-4 text-purple-400" /> },
  ];
  const sensors = state.sns;

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

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'GROUPING': return 'text-sky-400';
      case 'BLANK_FEED': return 'text-amber-400';
      case 'PACKING': return 'text-purple-400';
      case 'DISCHARGE': return 'text-emerald-400';
      default: return 'text-slate-500';
    }
  };

  const handleToggle = (key: string) => (val: boolean) => {
    setInput(key, val);
  };

  const allPermissivesOk =
    inputs.safety_ok &&
    inputs.estop_ok &&
    inputs.guards_closed &&
    inputs.utilities_ok &&
    inputs.blank_available;

  const plc = state?.plc;
  const scanRate = plc?.scan_duration_ms ? `${plc.scan_duration_ms.toFixed(1)}ms` : '—';

  return (
    <div className="flex-1 flex flex-col p-8 gap-8 w-full bg-slate-950">
      {/* Header */}
      <header className="flex items-center justify-between bg-slate-900/40 p-6 rounded-2xl border border-slate-800/50 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="bg-gradient-to-br from-indigo-500 to-emerald-500 p-0.5 rounded-xl">
            <div className="bg-slate-950 p-3 rounded-[10px]">
              <Settings className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black uppercase tracking-tight text-white leading-none">Diagnostics / I-O</h1>
              <Badge variant={allPermissivesOk ? 'success' : 'danger'} className="px-3 py-1 text-[10px] uppercase font-black tracking-widest leading-none">
                {allPermissivesOk ? 'All Permissives OK' : 'Permissive Failed'}
              </Badge>
            </div>
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.4em] mt-3">Machine Conditions / Signal Status / Dev Test Controls</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setDevMode(!devMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all ${
              devMode
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-500 hover:text-slate-300'
            }`}
          >
            <Wrench className="w-4 h-4" />
            {devMode ? 'Dev Mode ON' : 'Dev Mode OFF'}
          </button>
        </div>
      </header>

      {devMode && (
        <div className="flex items-center gap-3 px-5 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-400 font-bold">
            Dev Mode is active. Toggle buttons below will directly modify machine conditions. This is for testing only.
          </p>
        </div>
      )}

      {/* PLC Scan Cycle Status */}
      {plc && (
        <Card title="PLC Scan Cycle" className="border-slate-800/50 bg-[#0C1118]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Scan Counter</span>
              <span className="text-lg font-black text-white font-mono">{plc.scan_counter}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Scan Duration</span>
              <span className="text-lg font-black text-white font-mono">{scanRate}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Heartbeat</span>
              <span className="text-lg font-black text-white font-mono">{plc.heartbeat_counter}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Comms Health</span>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${plc.comms_healthy ? 'bg-emerald-400' : 'bg-red-400'} ${!plc.comms_healthy ? 'animate-pulse' : ''}`} />
                <span className={`text-sm font-black uppercase ${plc.comms_healthy ? 'text-emerald-400' : 'text-red-400'}`}>
                  {plc.comms_healthy ? 'OK' : 'LOST'}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-800/50">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Command ACK</span>
              <span className="text-sm font-bold text-slate-300">
                {plc.command_ack_code === 0 ? 'None' : plc.command_ack_code === 1 ? 'Accepted' : plc.command_ack_code === 2 ? 'Denied' : 'Error'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Current Mode</span>
              <span className="text-sm font-bold text-slate-300">{plc.current_mode === 0 ? 'AUTO' : 'MANUAL'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Requested Mode</span>
              <span className="text-sm font-bold text-slate-300">{plc.requested_mode === 0 ? 'AUTO' : 'MANUAL'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Mode ACK</span>
              <span className={`text-sm font-bold ${plc.mode_ack ? 'text-emerald-400' : 'text-slate-600'}`}>
                {plc.mode_ack ? 'Synced' : 'Pending'}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        {/* Left Column — Inputs & Permissives */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Safety & Permissives */}
          <Card title="Safety & Permissives" className="border-slate-800/50 bg-[#0C1118]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {safetyInputs.map((item) => (
                <DiagIndicator
                  key={item.key}
                  label={item.label}
                  value={inputs[item.key] as boolean}
                  icon={item.icon}
                  onToggle={devMode ? handleToggle(item.key) : undefined}
                  devMode={devMode}
                />
              ))}
            </div>
          </Card>

          {/* Material & Flow Conditions */}
          <Card title="Material & Flow Conditions" className="border-slate-800/50 bg-[#0C1118]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {materialInputs.map((item) => (
                <DiagIndicator
                  key={item.key}
                  label={item.label}
                  value={inputs[item.key] as boolean}
                  icon={item.icon}
                  onToggle={devMode ? handleToggle(item.key) : undefined}
                  devMode={devMode}
                />
              ))}
            </div>
          </Card>

          {/* Start Permissive Result */}
          <Card title="Start Permissive Evaluation" className="border-slate-800/50 bg-[#0C1118]">
            <div className="flex items-center justify-between p-5 rounded-xl bg-slate-900/40 border border-slate-800/50">
              <div className="flex items-center gap-4">
                {sts.start_permissive_ok ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-400" />
                )}
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Start Permissive OK</span>
                  <div className={`text-lg font-black uppercase tracking-wide ${sts.start_permissive_ok ? 'text-emerald-400' : 'text-red-400'}`}>
                    {sts.start_permissive_ok ? 'Granted' : 'Denied'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">HMI Start Button</span>
                <div className={`text-lg font-black uppercase tracking-wide ${hmi.start_button_enabled ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {hmi.start_button_enabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
            </div>

            {/* Permissive Breakdown */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { label: 'AUTO Mode', ok: sts.machine_mode === 'AUTO' },
                { label: 'No Active Fault', ok: !sts.fault_active },
                { label: 'Safety OK', ok: inputs.safety_ok },
                { label: 'E-Stop OK', ok: inputs.estop_ok },
                { label: 'Guards Closed', ok: inputs.guards_closed },
                { label: 'Utilities OK', ok: inputs.utilities_ok },
                { label: 'Blank Available', ok: inputs.blank_available },
                { label: 'Transfer Gap Clear', ok: state?.sns?.transfer_gap_clear ?? true },
                { label: 'Tray Stack Present', ok: state?.sns?.tray_stack_present ?? true },
                { label: 'Recipe Valid', ok: cfg.active_recipe_id.length > 0 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/30">
                  {item.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  )}
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${item.ok ? 'text-slate-400' : 'text-red-400'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Virtual Sensors */}
          <Card title="Virtual Sensors" className="border-slate-800/50 bg-[#0C1118]">
            <div className="flex flex-col gap-4">
              {/* Divider */}
              <div>
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Divider / Distribution</span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {[
                    { label: 'Divider Gap Clear', key: 'divider_gap_clear' as SensorKey, icon: <ArrowDownUp className="w-3 h-3" /> },
                    { label: 'Min Jam OK', key: 'divider_min_jam_ok' as SensorKey, icon: <GripVertical className="w-3 h-3" /> },
                  ].map((s) => (
                    <SensorPill key={s.key} label={s.label} value={sensors[s.key] ?? true} icon={s.icon} />
                  ))}
                </div>
              </div>
              {/* Grouping */}
              <div>
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Grouping / Release</span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {[
                    { label: 'Lane Fill OK', key: 'lane_fill_ok' as SensorKey, icon: <CheckCircle2 className="w-3 h-3" /> },
                    { label: 'Fill Mismatch', key: 'lane_fill_mismatch' as SensorKey, icon: <AlertTriangle className="w-3 h-3" /> },
                    { label: 'Stopper Closed', key: 'stopper_closed' as SensorKey, icon: <PanelLeftClose className="w-3 h-3" /> },
                    { label: 'Terminal Closed', key: 'terminal_closed' as SensorKey, icon: <PanelLeftOpen className="w-3 h-3" /> },
                  ].map((s) => (
                    <SensorPill key={s.key} label={s.label} value={sensors[s.key] ?? false} icon={s.icon} invert={s.key === 'lane_fill_mismatch'} />
                  ))}
                </div>
              </div>
              {/* Transfer */}
              <div>
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Transfer Interlock</span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {[
                    { label: 'Transfer Gap Clear', key: 'transfer_gap_clear' as SensorKey, icon: <MoveRight className="w-3 h-3" /> },
                  ].map((s) => (
                    <SensorPill key={s.key} label={s.label} value={sensors[s.key] ?? true} icon={s.icon} />
                  ))}
                </div>
              </div>
              {/* Tray */}
              <div>
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Tray / Blank</span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {[
                    { label: 'Tray Stack Present', key: 'tray_stack_present' as SensorKey, icon: <Box className="w-3 h-3" /> },
                    { label: 'Tray Vacuum OK', key: 'tray_vacuum_ok' as SensorKey, icon: <Zap className="w-3 h-3" /> },
                    { label: 'Tray Positioned', key: 'tray_positioned' as SensorKey, icon: <CheckCircle2 className="w-3 h-3" /> },
                    { label: 'Tray In Transport', key: 'tray_in_transport' as SensorKey, icon: <ArrowRight className="w-3 h-3" /> },
                  ].map((s) => (
                    <SensorPill key={s.key} label={s.label} value={sensors[s.key] ?? false} icon={s.icon} />
                  ))}
                </div>
              </div>
              {/* Forming / Discharge */}
              <div>
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Forming / Discharge</span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {[
                    { label: 'Chain Clear', key: 'chain_clear' as SensorKey, icon: <ArrowRight className="w-3 h-3" /> },
                    { label: 'Outlet Sensor OK', key: 'outlet_sensor_ok' as SensorKey, icon: <ScanEye className="w-3 h-3" /> },
                    { label: 'Tray Plate OK', key: 'tray_plate_sensor_ok' as SensorKey, icon: <CheckCircle2 className="w-3 h-3" /> },
                    { label: 'Open Flap', key: 'open_flap_detected' as SensorKey, icon: <AlertTriangle className="w-3 h-3" /> },
                  ].map((s) => (
                    <SensorPill key={s.key} label={s.label} value={sensors[s.key] ?? false} icon={s.icon} invert={s.key === 'open_flap_detected'} />
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column — Machine Feedback */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Machine State */}
          <Card title="Machine Feedback" className="border-slate-800/50 bg-[#0C1118]">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-slate-800/50">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Machine State</span>
                <Badge variant={getStateVariant(sts.machine_state)} className="px-4 py-1.5 text-xs font-black uppercase tracking-widest">
                  {sts.machine_state}
                </Badge>
                <span className="text-[10px] font-mono text-slate-600">({PLC_STATE_CODES[sts.machine_state] ?? '?'})</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-slate-800/50">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Machine Mode</span>
                <span className={`text-sm font-black uppercase tracking-wide ${sts.machine_mode === 'AUTO' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {sts.machine_mode}
                </span>
                <span className="text-[10px] font-mono text-slate-600">({PLC_MODE_CODES[sts.machine_mode] ?? '?'})</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-slate-800/50">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cycle Phase</span>
                <span className={`text-sm font-black uppercase tracking-wide ${getPhaseColor(sts.cycle_phase)}`}>
                  {sts.cycle_phase}
                </span>
                <span className="text-[10px] font-mono text-slate-600">({PLC_PHASE_CODES[sts.cycle_phase] ?? '?'})</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-slate-800/50">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cycle Active</span>
                <span className={`text-sm font-black uppercase tracking-wide ${sts.cycle_active ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {sts.cycle_active ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-slate-800/50">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fault Active</span>
                <span className={`text-sm font-black uppercase tracking-wide ${sts.fault_active ? 'text-red-400' : 'text-slate-600'}`}>
                  {sts.fault_active ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-slate-800/50">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Warning Active</span>
                <span className={`text-sm font-black uppercase tracking-wide ${sts.warning_active ? 'text-amber-400' : 'text-slate-600'}`}>
                  {sts.warning_active ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </Card>

          {/* Active Fault Detail */}
          {sts.fault_active && (
            <Card title="Active Fault" className="border-red-500/30 bg-[#0C1118]">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-red-400 uppercase tracking-wide">{fault.active_code}</span>
                      <span className="text-[10px] font-mono text-red-600">[PLC {PLC_FAULT_CODES[fault.active_code] ?? '?'}]</span>
                    </div>
                    <p className="text-xs text-red-300/70 mt-0.5">{fault.active_text}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500">
                  <div>Severity: <span className="text-slate-300">{fault.active_severity}</span></div>
                  <div>Latched: <span className="text-slate-300">{fault.latched ? 'Yes' : 'No'}</span></div>
                  <div>Timestamp: <span className="text-slate-300">{fault.timestamp || '—'}</span></div>
                  <div>Reset Allowed: <span className={hmi.reset_button_enabled ? 'text-emerald-400' : 'text-red-400'}>{hmi.reset_button_enabled ? 'Yes' : 'No'}</span></div>
                </div>
              </div>
            </Card>
          )}

          {/* Active Warning Detail */}
          {sts.warning_active && state?.warn?.active_code && (
            <Card title="Active Warning" className="border-amber-500/30 bg-[#0C1118]">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-amber-400 uppercase tracking-wide">{state.warn.active_code}</span>
                      <span className="text-[10px] font-mono text-amber-600">[PLC {PLC_WARN_CODES[state.warn.active_code] ?? '?'}]</span>
                    </div>
                    <p className="text-xs text-amber-300/70 mt-0.5">{state.warn.active_text}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500">
                  <div>Severity: <span className="text-slate-300">{state.warn.active_severity}</span></div>
                  <div>Auto-Clear: <span className="text-emerald-400">Yes</span></div>
                  <div>Timestamp: <span className="text-slate-300">{state.warn.timestamp || '—'}</span></div>
                  <div>Machine: <span className="text-emerald-400">Running</span></div>
                </div>
              </div>
            </Card>
          )}

          {/* Active Recipe */}
          <Card title="Active Recipe" className="border-slate-800/50 bg-[#0C1118]">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white uppercase tracking-wide">{cfg.active_recipe_name}</span>
                  <span className="text-[10px] font-mono text-slate-600">[PLC {PLC_RECIPE_CODES[cfg.active_recipe_id] ?? '?'}]</span>
                </div>
                <Badge variant="info" className="text-[9px] font-black uppercase tracking-widest">{cfg.active_recipe_id}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500">
                <div>Products: <span className="text-slate-300">{cfg.target_pack_count}</span></div>
                <div>Grid: <span className="text-slate-300">{cfg.grid_cols} cols</span></div>
                <div>Cycle Time: <span className="text-slate-300">{cfg.nominal_cycle_time_sec.toFixed(1)}s</span></div>
                <div>Reject Prob: <span className="text-slate-300">{(cfg.reject_probability * 100).toFixed(1)}%</span></div>
              </div>
            </div>
          </Card>

          {/* Last Reject Reason */}
          {out.last_reject_reason && (
            <Card title="Last Reject Reason" className="border-slate-800/50 bg-[#0C1118]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-black text-amber-400 uppercase tracking-wide">{out.last_reject_reason}</span>
                  <span className="text-[10px] font-mono text-slate-600">[PLC {PLC_REJECT_CODES[out.last_reject_reason] ?? '?'}]</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Pack #{out.cycle_count}</span>
              </div>
            </Card>
          )}

          {/* HMI Button States */}
          <Card title="HMI Button States" className="border-slate-800/50 bg-[#0C1118]">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Start', ok: hmi.start_button_enabled },
                { label: 'Stop', ok: hmi.stop_button_enabled },
                { label: 'Reset', ok: hmi.reset_button_enabled },
                { label: 'Recipe Change', ok: hmi.recipe_change_enabled },
                { label: 'Auto Mode', ok: hmi.auto_mode_enabled },
                { label: 'Manual Mode', ok: hmi.manual_mode_enabled },
              ].map((btn) => (
                <div key={btn.label} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                  btn.ok ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-900/30 border-slate-800/30'
                }`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{btn.label}</span>
                  {btn.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-slate-700" />
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* PLC Snapshot Debug — Dev Mode Only */}
      {devMode && plc && (
        <div className="mt-4">
          <button
            onClick={() => setShowPlcDebug(!showPlcDebug)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700/50 bg-slate-900/40 text-slate-400 hover:text-slate-200 transition-all"
          >
            <Code className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">PLC Snapshot Debug</span>
            {showPlcDebug ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span className="text-[10px] font-mono text-slate-600 ml-2">v{plc.scan_counter}</span>
          </button>

          {showPlcDebug && (
            <div className="mt-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800/50 font-mono text-[10px]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2">
                {/* STS */}
                <div className="col-span-2 md:col-span-4">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">sts</span>
                </div>
                <div className="text-slate-400">machine_state: <span className="text-amber-400">{plc.current_mode === 0 ? sts.machine_state : sts.machine_state}</span></div>
                <div className="text-slate-400">machine_mode: <span className="text-amber-400">{sts.machine_mode}</span></div>
                <div className="text-slate-400">cycle_phase: <span className="text-amber-400">{sts.cycle_phase}</span></div>
                <div className="text-slate-400">fault_active: <span className={sts.fault_active ? 'text-red-400' : 'text-slate-600'}>{String(sts.fault_active)}</span></div>
                <div className="text-slate-400">warning_active: <span className={sts.warning_active ? 'text-amber-400' : 'text-slate-600'}>{String(sts.warning_active)}</span></div>
                <div className="text-slate-400">start_permissive_ok: <span className={sts.start_permissive_ok ? 'text-emerald-400' : 'text-slate-600'}>{String(sts.start_permissive_ok)}</span></div>

                {/* OUT */}
                <div className="col-span-2 md:col-span-4 mt-2">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">out</span>
                </div>
                <div className="text-slate-400">cycle_count: <span className="text-white">{out.cycle_count}</span></div>
                <div className="text-slate-400">good_pack_count: <span className="text-emerald-400">{out.good_pack_count}</span></div>
                <div className="text-slate-400">reject_pack_count: <span className="text-red-400">{out.reject_pack_count}</span></div>
                <div className="text-slate-400">last_pack_result: <span className="text-amber-400">{out.last_pack_result}</span></div>
                <div className="text-slate-400">last_reject_reason: <span className="text-amber-400">{out.last_reject_reason || '—'}</span></div>
                <div className="text-slate-400">blanks_remaining: <span className="text-white">{out.blanks_remaining}</span></div>

                {/* FAULT */}
                <div className="col-span-2 md:col-span-4 mt-2">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">fault</span>
                </div>
                <div className="text-slate-400">active_code: <span className="text-red-400">{fault.active_code || '—'}</span></div>
                <div className="text-slate-400">latched: <span className={fault.latched ? 'text-red-400' : 'text-slate-600'}>{String(fault.latched)}</span></div>
                <div className="text-slate-400">active_count: <span className="text-white">{fault.active_count}</span></div>

                {/* WARN */}
                <div className="col-span-2 md:col-span-4 mt-2">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">warn</span>
                </div>
                <div className="text-slate-400">active_code: <span className="text-amber-400">{state?.warn?.active_code || '—'}</span></div>
                <div className="text-slate-400">active_count: <span className="text-white">{state?.warn?.active_count || 0}</span></div>

                {/* SNS */}
                <div className="col-span-2 md:col-span-4 mt-2">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">sns</span>
                </div>
                {Object.entries(state?.sns || {}).map(([key, val]) => (
                  <div key={key} className="text-slate-400">
                    {key}: <span className={val ? 'text-emerald-400' : 'text-slate-600'}>{String(val)}</span>
                  </div>
                ))}

                {/* PLC */}
                <div className="col-span-2 md:col-span-4 mt-2">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">plc</span>
                </div>
                <div className="text-slate-400">scan_counter: <span className="text-white">{plc.scan_counter}</span></div>
                <div className="text-slate-400">heartbeat: <span className="text-white">{plc.heartbeat_counter}</span></div>
                <div className="text-slate-400">comms_healthy: <span className={plc.comms_healthy ? 'text-emerald-400' : 'text-red-400'}>{String(plc.comms_healthy)}</span></div>
                <div className="text-slate-400">command_ack: <span className="text-amber-400">{plc.command_ack_code}</span></div>
                <div className="text-slate-400">last_cmd: <span className="text-amber-400">{plc.last_command_code}</span></div>
                <div className="text-slate-400">current_mode: <span className="text-white">{plc.current_mode}</span></div>
                <div className="text-slate-400">mode_ack: <span className={plc.mode_ack ? 'text-emerald-400' : 'text-slate-600'}>{String(plc.mode_ack)}</span></div>
                <div className="text-slate-400">scan_ms: <span className="text-white">{plc.scan_duration_ms.toFixed(2)}</span></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
