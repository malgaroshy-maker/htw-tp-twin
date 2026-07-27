import { useNavigate } from 'react-router-dom';
import { useSimulator } from '../../hooks/useSimulator';
import type { EventRecord } from '../../hooks/useSimulator';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import {
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Clock,
  Tag,
  Activity,
} from 'lucide-react';

const SEVERITY_STYLES: Record<string, { dot: string; row: string; badge: string; variant: 'error' | 'warning' | 'info' }> = {
  FAULT:   { dot: 'bg-red-400',    row: 'hover:bg-red-500/5', badge: 'border-red-500/30 bg-red-500/10 text-red-300', variant: 'error' },
  WARNING: { dot: 'bg-amber-400',  row: 'hover:bg-amber-500/5', badge: 'border-amber-500/30 bg-amber-500/10 text-amber-300', variant: 'warning' },
  INFO:    { dot: 'bg-blue-400',   row: 'hover:bg-blue-500/5', badge: 'border-slate-700 bg-slate-800/40 text-slate-400', variant: 'info' },
};

function EventRow({ event }: { event: EventRecord }) {
  const style = SEVERITY_STYLES[event.severity] ?? SEVERITY_STYLES.INFO;
  const ts = event.ts ? new Date(event.ts).toLocaleTimeString() : '---';

  return (
    <div className={`flex items-center gap-4 px-4 py-2.5 rounded-lg border border-transparent transition-all ${style.row}`}>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-[11px] font-bold text-slate-200 font-mono truncate">{event.event_code}</span>
        <span className="text-[10px] text-slate-500 truncate">{event.message}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${style.badge}`}>
          {event.severity}
        </span>
        <span className="text-[9px] font-mono text-slate-600">{ts}</span>
      </div>
    </div>
  );
}

export function Faults() {
  const navigate = useNavigate();
  const { state, events, sendCommand } = useSimulator();

  if (!state) {
    return <div className="p-8 text-slate-500">Loading...</div>;
  }

  const { sts, fault, hmi } = state;

  // Filter events to show faults and warnings only, most recent first
  const faultEvents = [...events]
    .reverse()
    .filter((e) => e.severity === 'FAULT' || e.severity === 'WARNING');

  return (
    <div className="flex-1 flex flex-col p-8 gap-8 w-full bg-slate-950 overflow-y-auto">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-6 mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl border ${
            sts.fault_active
              ? 'bg-red-500/20 border-red-500/30'
              : 'bg-slate-800/60 border-slate-700'
          }`}>
            {sts.fault_active
              ? <ShieldAlert className="w-6 h-6 text-red-400" />
              : <ShieldCheck className="w-6 h-6 text-emerald-400" />
            }
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white">Faults & Alarms</h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">
              {sts.fault_active ? 'Active fault detected — machine stopped' : 'All systems operational'}
            </p>
          </div>
        </div>
        <Badge variant={sts.fault_active ? 'danger' : 'success'} className="text-[10px] font-black">
          {sts.fault_active ? '● FAULTED' : '✓ CLEAR'}
        </Badge>
      </header>

      {/* Active Fault Panel */}
      {sts.fault_active ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Active Fault Details" className="bg-red-950/20 border-red-900/50">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-red-600/80">
                  <AlertTriangle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-red-300 uppercase tracking-wider font-mono">
                    {fault.active_code}
                  </h3>
                  <p className="text-sm text-red-200/70">{fault.active_text}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Severity</p>
                  <p className="text-sm font-bold text-red-300">{fault.active_severity}</p>
                </div>
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Latched</p>
                  <p className="text-sm font-bold text-red-300">{fault.latched ? 'Yes — Reset Required' : 'No'}</p>
                </div>
                {fault.timestamp && (
                  <div className="col-span-2 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Timestamp
                    </p>
                    <p className="text-[11px] font-mono text-slate-300">{new Date(fault.timestamp).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card title="Recovery Action">
            <div className="flex flex-col gap-4 h-full justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-300 mb-3">Operator Steps:</h3>
                <div className="flex flex-col gap-2">
                  {[
                    'Inspect the machine for the cause of the fault.',
                    'Clear any physical obstruction or material issue.',
                    'Ensure all safety interlocks are satisfied.',
                    'Press Reset to clear the latched fault.',
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-slate-400">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-400 mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3 mt-4">
                <Button
                  id="btn-fault-reset"
                  variant="danger"
                  size="lg"
                  disabled={!hmi.reset_button_enabled}
                  className="w-full font-black uppercase tracking-widest"
                  onClick={() => sendCommand('reset')}
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Reset Machine
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full border border-slate-700 text-slate-400 hover:text-slate-200 uppercase tracking-wider"
                  onClick={() => navigate('/diagnostics')}
                >
                  <ArrowRight className="w-4 h-4 mr-2" /> Open Diagnostics
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="flex items-center gap-6 px-6 py-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
          <ShieldCheck className="w-10 h-10 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-black uppercase tracking-wider text-emerald-300">No Active Faults</p>
            <p className="text-[11px] text-slate-500 mt-0.5">All machine subsystems are operating within normal parameters.</p>
          </div>
        </div>
      )}

      {/* Fault & Warning History */}
      <Card title="Fault & Warning History" className="border-slate-800/50 bg-slate-900/40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
            <Activity className="w-3 h-3" />
            {faultEvents.length} event{faultEvents.length !== 1 ? 's' : ''} — most recent first
          </div>
          {faultEvents.length > 0 && (
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded border border-red-500/30 bg-red-500/10 text-red-400 font-black uppercase">
                <Tag className="w-2.5 h-2.5" /> Faults
              </span>
              <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 font-black uppercase">
                <Tag className="w-2.5 h-2.5" /> Warnings
              </span>
            </div>
          )}
        </div>

        {faultEvents.length === 0 ? (
          <div className="text-center py-10">
            <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-700" />
            <p className="text-sm text-slate-600">No fault or warning events in this session.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-96 overflow-y-auto pr-1">
            {faultEvents.map((event, i) => (
              <EventRow key={`${event.event_code}-${event.ts}-${i}`} event={event} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
