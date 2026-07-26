import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Box,
  Camera,
  AlertTriangle,
  Expand,
  Layers3,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  ShieldAlert,
  RotateCcw,
  Rotate3d,
  ScanLine,
  Settings2,
  Square,
  Trash2,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { useSimulator } from '../../hooks/useSimulator';
import type { SimulatorState } from '../../hooks/simTypes';

const SimulationView3D = lazy(async () => {
  const module = await import('./SimulationView3D');
  return { default: module.SimulationView3D };
});

export type CameraPresetKey = 'overview' | 'grouping' | 'transfer' | 'tray' | 'transport' | 'discharge';

export interface ViewerLayerState {
  frame: boolean;
  product: boolean;
  tray: boolean;
  transport: boolean;
  sensors: boolean;
}

const DEFAULT_LAYERS: ViewerLayerState = {
  frame: true,
  product: true,
  tray: true,
  transport: true,
  sensors: true,
};

const CAMERA_PRESETS: Array<{ key: CameraPresetKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'grouping', label: 'Grouping' },
  { key: 'transfer', label: 'Transfer' },
  { key: 'tray', label: 'Tray Infeed' },
  { key: 'transport', label: 'Main Transport' },
  { key: 'discharge', label: 'Discharge' },
];

function phaseText(state: SimulatorState | null) {
  return state?.sts?.cycle_phase?.replace('_', ' ') ?? 'Loading';
}

export function ThreeDSimPage() {
  const {
    state,
    sendCommand,
    resetSession,
    isAutoTickEnabled,
    setIsAutoTickEnabled,
  } = useSimulator();

  const [cameraPreset, setCameraPreset] = useState<CameraPresetKey>('overview');
  const [viewerLayers, setViewerLayers] = useState<ViewerLayerState>(DEFAULT_LAYERS);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayers, setShowLayers] = useState(true);
  const [showPresets, setShowPresets] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);

  const resetView = () => {
    setCameraPreset(current => (current === 'overview' ? 'transfer' : 'overview'));
    requestAnimationFrame(() => setCameraPreset('overview'));
  };

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === viewportRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const handleFullscreen = async () => {
    if (!viewportRef.current) return;
    if (document.fullscreenElement === viewportRef.current) {
      await document.exitFullscreen();
      return;
    }
    await viewportRef.current.requestFullscreen();
  };

  const machineState = state?.sts?.machine_state ?? 'CONNECTING';
  const isRunning = machineState === 'RUNNING';
  const phase = phaseText(state);
  const rejectCount = state?.out?.reject_accumulation_count ?? 0;
  const canAck = Boolean(state?.sts?.fault_active || state?.sts?.warning_active);
  const statusTone = useMemo(() => {
    if (state?.sts?.fault_active) return 'text-red-400 border-red-500/30 bg-red-500/10';
    if (state?.sts?.warning_active) return 'text-amber-300 border-amber-500/30 bg-amber-500/10';
    return 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10';
  }, [state]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.08),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.08),_transparent_28%)]" />

      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-950/75 px-3 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-slate-300 backdrop-blur-md transition hover:border-slate-500/70 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Overview
            </Link>
            <div className="rounded-2xl border border-slate-700/60 bg-slate-950/70 px-4 py-2.5 backdrop-blur-md">
              <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">3D Machine Viewer</div>
              <div className="mt-1 flex items-center gap-3">
                <span className="text-lg font-black text-white">Tray Packer</span>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${statusTone}`}>
                  {machineState}
                </span>
                {state?.sts?.machine_mode === 'MANUAL' && (
                  <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Manual
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="border border-slate-700/60 bg-slate-950/75 text-slate-300 hover:bg-slate-900" onClick={resetView}>
              <Rotate3d className="h-4 w-4" />
              Reset View
            </Button>
            <Button variant="ghost" size="sm" className="border border-slate-700/60 bg-slate-950/75 text-slate-300 hover:bg-slate-900" onClick={() => setShowPresets(current => !current)}>
              <Camera className="h-4 w-4" />
              Views
            </Button>
            <Button variant="ghost" size="sm" className="border border-slate-700/60 bg-slate-950/75 text-slate-300 hover:bg-slate-900" onClick={() => setShowLayers(current => !current)}>
              <Layers3 className="h-4 w-4" />
              Layers
            </Button>
            <Button variant="ghost" size="sm" className="border border-slate-700/60 bg-slate-950/75 text-slate-300 hover:bg-slate-900" onClick={handleFullscreen}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </Button>
          </div>
        </header>

        <div className="relative flex-1 px-6 pb-6">
          <div
            ref={viewportRef}
            className="relative h-[calc(100vh-112px)] overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 shadow-[0_0_80px_rgba(2,6,23,0.8)]"
          >
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-[10px] font-mono uppercase tracking-[0.32em] text-slate-500">
                  Loading 3D Scene...
                </div>
              }
            >
              <SimulationView3D
                state={state}
                cameraPreset={cameraPreset}
                layerVisibility={viewerLayers}
                controlsEnabled
                showSceneHud={false}
                sendCommand={sendCommand}
              />
            </Suspense>

            <div className="pointer-events-none absolute left-5 top-5 z-20 flex max-w-sm flex-col gap-3">
              <div className="rounded-2xl border border-slate-700/60 bg-slate-950/80 p-4 backdrop-blur-md">
                <div className="text-[9px] font-black uppercase tracking-[0.28em] text-sky-300">Current Phase</div>
                <div className="mt-2 text-lg font-black text-white">{phase}</div>
                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">View: {CAMERA_PRESETS.find(preset => preset.key === cameraPreset)?.label ?? 'Overview'}</div>
                <p className="mt-2 text-xs leading-5 text-slate-300">
                  Dedicated 3D view with adjustable camera, isolated machine footprint, and separated low/high machine layers.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-700/60 bg-slate-950/80 p-4 backdrop-blur-md">
                <div className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">Reject / Fault Status</div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Reject Conveyor</div>
                    <div className={`mt-2 text-lg font-black ${rejectCount >= 3 ? 'text-red-400' : rejectCount === 2 ? 'text-amber-300' : 'text-slate-100'}`}>
                      {rejectCount}/3
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      {rejectCount >= 3 ? 'FULL' : rejectCount === 2 ? 'NEAR FULL' : 'AVAILABLE'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Last Reject</div>
                    <div className="mt-2 text-sm font-black text-amber-300">
                      {state?.out?.last_reject_reason || 'NONE'}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      {state?.out?.last_pack_result || 'NO RESULT'}
                    </div>
                  </div>
                </div>
                {(state?.sts?.fault_active || state?.sts?.warning_active) && (
                  <div className={`mt-3 rounded-xl border p-3 ${
                    state?.sts?.fault_active
                      ? 'border-red-500/30 bg-red-500/10'
                      : 'border-amber-500/30 bg-amber-500/10'
                  }`}>
                    <div className="flex items-center gap-2">
                      {state?.sts?.fault_active ? <ShieldAlert className="h-4 w-4 text-red-300" /> : <AlertTriangle className="h-4 w-4 text-amber-300" />}
                      <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${
                        state?.sts?.fault_active ? 'text-red-300' : 'text-amber-300'
                      }`}>
                        {state?.sts?.fault_active ? state?.fault?.active_code || 'FAULT' : state?.warn?.active_code || 'WARNING'}
                      </span>
                    </div>
                    <p className={`mt-2 text-xs leading-5 ${
                      state?.sts?.fault_active ? 'text-red-200/85' : 'text-amber-100/85'
                    }`}>
                      {state?.sts?.fault_active ? state?.fault?.active_text || 'Active machine fault.' : state?.warn?.active_text || 'Active machine warning.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="absolute bottom-5 left-5 z-20 flex flex-col gap-3">
              <div className="rounded-2xl border border-slate-700/60 bg-slate-950/80 p-3 backdrop-blur-md">
                <div className="mb-3 text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">Machine Controls</div>
                <div className="flex flex-wrap gap-2">
                  <Button variant={isRunning ? 'secondary' : 'primary'} size="sm" onClick={() => sendCommand('start')}>
                    <Play className="h-4 w-4" />
                    Start
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => sendCommand('stop')}>
                    <Square className="h-4 w-4" />
                    Stop
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => sendCommand('reset')}>
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                  <Button variant="ghost" size="sm" className={`border ${canAck ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-slate-700/60 bg-slate-900 text-slate-500'}`} onClick={() => sendCommand('ack_alarm')} disabled={!canAck}>
                    <ShieldAlert className="h-4 w-4" />
                    Ack Alarm
                  </Button>
                  <Button variant="warning" size="sm" onClick={() => sendCommand('refill_blanks')}>
                    <Box className="h-4 w-4" />
                    Refill Blanks
                  </Button>
                  <Button variant="ghost" size="sm" className={`border ${rejectCount > 0 ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-slate-700/60 bg-slate-900 text-slate-500'}`} onClick={() => sendCommand('clear_rejects')} disabled={rejectCount === 0}>
                    <Trash2 className="h-4 w-4" />
                    Clear Reject Conveyor
                  </Button>
                  <Button variant="ghost" size="sm" className={`border ${isAutoTickEnabled ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-slate-700/60 bg-slate-900 text-slate-300'}`} onClick={() => setIsAutoTickEnabled(!isAutoTickEnabled)}>
                    {isAutoTickEnabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    Auto-Tick
                  </Button>
                  <Button variant="ghost" size="sm" className="border border-slate-700/60 bg-slate-900 text-slate-300" onClick={resetSession}>
                    <ScanLine className="h-4 w-4" />
                    Reset Session
                  </Button>
                </div>
              </div>
            </div>

            {showPresets && (
              <div className="absolute right-5 top-5 z-20 w-64 rounded-2xl border border-slate-700/60 bg-slate-950/80 p-3 backdrop-blur-md">
                <div className="mb-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
                  <Camera className="h-4 w-4" />
                  Camera Presets
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CAMERA_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => setCameraPreset(preset.key)}
                      className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition ${
                        cameraPreset === preset.key
                          ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
                          : 'border-slate-700/70 bg-slate-900 text-slate-300 hover:border-slate-500/80 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showLayers && (
              <div className="absolute right-5 top-[210px] z-20 w-64 rounded-2xl border border-slate-700/60 bg-slate-950/80 p-3 backdrop-blur-md">
                <div className="mb-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
                  <Settings2 className="h-4 w-4" />
                  Layer Visibility
                </div>
                <div className="flex flex-col gap-2">
                  {([
                    ['frame', 'Frame / Covers'],
                    ['product', 'Product Flow'],
                    ['tray', 'Tray / Blank Flow'],
                    ['transport', 'Chains / Guides / Glue'],
                    ['sensors', 'Sensors / Labels'],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setViewerLayers(current => ({ ...current, [key]: !current[key] }))}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-[11px] font-semibold transition ${
                        viewerLayers[key]
                          ? 'border-sky-400/30 bg-sky-500/10 text-sky-200'
                          : 'border-slate-700/70 bg-slate-900 text-slate-400'
                      }`}
                    >
                      <span>{label}</span>
                      {viewerLayers[key] ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
