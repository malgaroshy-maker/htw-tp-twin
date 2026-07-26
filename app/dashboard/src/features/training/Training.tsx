import { useSimulator } from '../../hooks/useSimulator';
import type { ScenarioInfo } from '../../hooks/simTypes';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import {
  GraduationCap,
  PlayCircle,
  StopCircle,
  CheckSquare,
  Target,
  Clock,
  Tag,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

const DIFF_COLORS: Record<string, string> = {
  Easy:   'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
  Medium: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
  Hard:   'text-red-400 border-red-500/30 bg-red-500/5',
};

function getDifficulty(scenario: ScenarioInfo): string {
  if (scenario.timeout_sec <= 60) return 'Easy';
  if (scenario.timeout_sec <= 180) return 'Medium';
  return 'Hard';
}

interface ScenarioCardProps {
  scenario: ScenarioInfo;
  isActive: boolean;
  activeStatus: string;
  onStart: (id: string) => void;
  onStop: () => void;
}

function ScenarioCard({ scenario, isActive, activeStatus, onStart, onStop }: ScenarioCardProps) {
  const difficulty = getDifficulty(scenario);
  const isRunning = activeStatus === 'RUNNING';

  return (
    <div className={`flex flex-col gap-4 p-5 rounded-2xl border transition-all ${
      isActive
        ? 'bg-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/10'
        : 'bg-slate-900/40 border-slate-800/50 hover:border-slate-700/70'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">{scenario.scenario_name}</h3>
            {isActive && (
              <Badge variant={isRunning ? 'info' : 'success'} className="text-[9px] animate-pulse">
                {isRunning ? '● LIVE' : activeStatus}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">{scenario.description}</p>
        </div>
        <span className={`flex-shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${DIFF_COLORS[difficulty] ?? DIFF_COLORS.Medium}`}>
          {difficulty}
        </span>
      </div>

      {/* Goals */}
      {scenario.goals.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
            <Target className="w-3 h-3" /> Objectives
          </span>
          {scenario.goals.map((goal, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px] text-slate-400">
              <span className="text-indigo-400 font-bold mt-0.5">·</span>
              {goal}
            </div>
          ))}
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-4 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {Math.round(scenario.timeout_sec / 60)}min timeout
        </span>
        <span className="flex items-center gap-1">
          <Tag className="w-3 h-3" />
          {scenario.initial_recipe}
        </span>
        {scenario.abort_allowed && (
          <span className="flex items-center gap-1 text-amber-500/60">
            <AlertTriangle className="w-3 h-3" /> Abortable
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1 border-t border-slate-800/50">
        {isActive ? (
          <Button
            variant="danger"
            size="sm"
            className="flex-1 font-black uppercase"
            onClick={onStop}
          >
            <StopCircle className="w-4 h-4 mr-1" />
            {isRunning ? 'Abort Scenario' : 'End Session'}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            className="flex-1 font-black uppercase shadow-lg shadow-indigo-500/10"
            onClick={() => onStart(scenario.scenario_id)}
          >
            <PlayCircle className="w-4 h-4 mr-1" />
            Launch Scenario
          </Button>
        )}
      </div>

      {/* Success Criteria (shown when active) */}
      {isActive && scenario.success_criteria.length > 0 && (
        <div className="flex flex-col gap-1 pt-2 border-t border-indigo-500/20">
          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1">
            <CheckSquare className="w-3 h-3" /> Success Criteria
          </span>
          {scenario.success_criteria.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px] text-indigo-300/70">
              <span className="font-bold mt-0.5">·</span>
              {c}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Training() {
  const { state, scenarios, startScenario, stopScenario, askAi, aiResponse } = useSimulator();

  if (!state) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-slate-800 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-mono uppercase tracking-widest text-xs">Loading Scenarios...</p>
        </div>
      </div>
    );
  }

  const { cfg, sts } = state;
  const activeScenarioId = cfg.active_scenario_id;
  const activeStatus = cfg.active_scenario_status;
  const isScenarioRunning = activeStatus === 'RUNNING';

  return (
    <div className="flex-1 flex flex-col p-8 gap-8 w-full bg-slate-950 overflow-y-auto">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-6 mb-2">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-500/20 p-3 rounded-xl border border-indigo-500/30">
            <GraduationCap className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white">Training Scenarios</h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">
              Fault Injection · Operator Drills · Situational Awareness
            </p>
          </div>
        </div>

        {/* Active Scenario Banner */}
        {activeScenarioId && (
          <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border ${
            isScenarioRunning
              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
              : 'bg-slate-800/60 border-slate-700 text-slate-400'
          }`}>
            {isScenarioRunning && <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />}
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isScenarioRunning ? `Active: ${activeScenarioId}` : `Last: ${activeScenarioId} — ${activeStatus}`}
            </span>
          </div>
        )}
      </header>

      {/* Machine State Warning */}
      {sts.machine_state !== 'STOPPED' && !isScenarioRunning && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-300 text-sm font-bold uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Machine must be STOPPED before launching a new scenario
        </div>
      )}

      {/* Scenario Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {scenarios.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-slate-500">
            <GraduationCap className="w-10 h-10 mx-auto mb-3 text-slate-700" />
            <p className="text-sm">No scenarios loaded from <code className="text-slate-400">configs/scenarios.json</code></p>
          </div>
        ) : (
          scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.scenario_id}
              scenario={scenario}
              isActive={scenario.scenario_id === activeScenarioId}
              activeStatus={scenario.scenario_id === activeScenarioId ? activeStatus : ''}
              onStart={startScenario}
              onStop={stopScenario}
            />
          ))
        )}
      </div>

      {/* AI Post-Session Summary */}
      {activeScenarioId && (
        <Card title="AI Scenario Debrief" className="border-indigo-500/20 bg-slate-900/40">
          <div className="flex flex-col gap-4">
            <p className="text-[11px] text-slate-400">
              Request an AI-generated analysis of the last session — what happened, why, and what the operator could do better.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 font-black uppercase"
                disabled={aiResponse?.loading ?? false}
                onClick={() => askAi('session-summary')}
              >
                {aiResponse?.loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <GraduationCap className="w-4 h-4 mr-2" />
                )}
                Generate Debrief
              </Button>
            </div>
            {aiResponse?.output && !aiResponse?.loading && (
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">
                {aiResponse.output}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
