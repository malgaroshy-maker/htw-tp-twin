import { Play, Square, Target } from 'lucide-react';
import { Button } from './Button';

interface Scenario {
  scenario_id: string;
  scenario_name: string;
  description: string;
  goals: string[];
}

interface ScenarioSelectorProps {
  scenarios: Scenario[];
  activeScenarioId: string;
  activeScenarioStatus?: string;
  onStart: (id: string) => void;
  onStop: () => void;
}

export function ScenarioSelector({ 
  scenarios, 
  activeScenarioId, 
  activeScenarioStatus = 'IDLE',
  onStart, 
  onStop 
}: ScenarioSelectorProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'WAITING_FOR_RECOVERY': return 'text-amber-500 bg-amber-500/20 border-amber-500/20 animate-pulse ring-1 ring-amber-500/50';
      case 'COMPLETED': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'FAILED': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'ABORTED': return 'text-slate-400 bg-slate-800/50 border-slate-700/50';
      default: return 'text-slate-500 bg-slate-800/30 border-slate-700/50';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
          Training Scenarios
        </div>
        {activeScenarioId && (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${getStatusColor(activeScenarioStatus)}`}>
            {activeScenarioStatus.replace(/_/g, ' ')}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {scenarios.map((s) => (
          <div 
            key={s.scenario_id}
            className={`group p-4 rounded-xl border transition-all duration-300 ${
              activeScenarioId === s.scenario_id 
                ? 'bg-amber-500/5 border-amber-500/40 shadow-[0_4px_20px_rgba(245,158,11,0.1)]' 
                : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/30'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                   <h4 className={`text-[11px] font-black uppercase tracking-wider truncate ${
                     activeScenarioId === s.scenario_id ? 'text-amber-500' : 'text-slate-200'
                   }`}>
                     {s.scenario_name}
                   </h4>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2 italic">{s.description}</p>
              </div>
              
              {activeScenarioId === s.scenario_id ? (
                <div className="flex flex-col gap-1">
                   <Button 
                     variant="danger" 
                     size="sm" 
                     onClick={onStop} 
                     className="h-8 px-3 text-[9px] font-black tracking-widest flex items-center justify-center gap-2"
                   >
                     <Square className="w-3 h-3 fill-current" /> ABORT
                   </Button>
                </div>
              ) : (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => onStart(s.scenario_id)} 
                  className="h-8 px-3 text-[9px] font-black tracking-widest opacity-60 group-hover:opacity-100 transition-opacity"
                  disabled={!!activeScenarioId}
                >
                  <Play className="w-3 h-3 fill-current mr-1" /> START
                </Button>
              )}
            </div>

            {activeScenarioId === s.scenario_id && (
              <div className="mt-4 pt-4 border-t border-amber-500/10 flex flex-col gap-3 animate-in shadow-inner">
                <div className="flex items-start gap-3">
                  <Target className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Process Goals</p>
                    <ul className="grid grid-cols-1 gap-1.5">
                      {s.goals.map((g, i) => (
                        <li key={i} className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                          <div className="w-1 h-1 rounded-full bg-slate-700" />
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
