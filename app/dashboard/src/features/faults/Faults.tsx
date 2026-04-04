import { useSimulator } from '../../hooks/useSimulator';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { RotateCcw, AlertTriangle } from 'lucide-react';

export function Faults() {
  const { state, sendCommand } = useSimulator();

  if (!state) {
    return <div className="p-8 text-slate-500">Loading...</div>;
  }

  const { sts, fault, hmi, evt } = state;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <header className="border-b border-slate-800 pb-4 mb-6">
        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-100">Faults & Alarms</h1>
        <p className="text-sm text-slate-500">
          {sts.fault_active ? 'An active fault is stopping the machine.' : 'No active faults.'}
        </p>
      </header>

      {sts.fault_active ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Active Fault Details" className="bg-red-950/20 border-red-900/50">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-red-600">
                  <AlertTriangle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-red-300 uppercase tracking-wider">{fault.active_code}</h3>
                  <p className="text-sm text-red-200">{fault.active_text}</p>
                </div>
              </div>
              <div className="text-xs">
                <p><span className="font-bold text-slate-400">Severity:</span> {fault.active_severity}</p>
                <p><span className="font-bold text-slate-400">Latched:</span> {fault.latched ? 'Yes (Reset Required)' : 'No'}</p>
              </div>
            </div>
          </Card>
          <Card title="Recovery Action">
            <div className="flex flex-col gap-4 h-full justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-300 mb-2">Suggested Action:</h3>
                <p className="text-sm text-slate-400">
                  1. Manually inspect the machine for the cause of the fault.<br/>
                  2. Clear any physical obstruction.<br/>
                  3. Once the condition is resolved, press the reset button.
                </p>
              </div>
              <Button 
                variant="danger" 
                size="lg" 
                disabled={!hmi.reset_button_enabled}
                onClick={() => sendCommand('reset')}
              >
                <RotateCcw className="w-4 h-4" /> Reset Machine
              </Button>
            </div>
          </Card>
          <Card title="Recent Events" className="md:col-span-2">
            <p className="text-xs text-slate-400">Last event before fault: <span className="font-mono text-slate-200">{evt.last_event_code}</span></p>
          </Card>
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-slate-500">No active faults to display.</p>
        </div>
      )}
    </div>
  );
}
