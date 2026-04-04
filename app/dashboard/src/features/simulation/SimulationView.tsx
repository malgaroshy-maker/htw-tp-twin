import { Suspense, lazy, useEffect, useState } from 'react';
import type { SimulatorState } from '../../hooks/simTypes';
import { SimulationView2D } from './SimulationView2D';

const SimulationView3D = lazy(async () => {
  const module = await import('./SimulationView3D');
  return { default: module.SimulationView3D };
});

type SimulationMode = '2d' | '3d';

interface SimulationViewProps {
  state: SimulatorState | null;
}

export function SimulationView({ state }: SimulationViewProps) {
  const [is3DAllowed, setIs3DAllowed] = useState(true);
  const [mode, setMode] = useState<SimulationMode>('3d');

  useEffect(() => {
    const evaluate = () => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const desktopWidth = window.innerWidth >= 1024;
      const allowed = desktopWidth && !reducedMotion;
      setIs3DAllowed(allowed);
      setMode(current => (allowed ? current : '2d'));
    };

    evaluate();
    window.addEventListener('resize', evaluate);
    return () => window.removeEventListener('resize', evaluate);
  }, []);

  if (!state) {
    return <SimulationView2D state={state} />;
  }

  const effectiveMode: SimulationMode = is3DAllowed ? mode : '2d';

  return (
    <div className="relative h-full w-full">
      <div className="absolute right-5 top-5 z-20 flex items-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-950/85 p-2 backdrop-blur-md">
        <span className="px-2 text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">Simulation</span>
        <button
          type="button"
          onClick={() => setMode('2d')}
          className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${effectiveMode === '2d' ? 'bg-slate-200 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
        >
          2D
        </button>
        <button
          type="button"
          onClick={() => is3DAllowed && setMode('3d')}
          disabled={!is3DAllowed}
          className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${effectiveMode === '3d' ? 'bg-emerald-400 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-slate-200'} disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-700`}
        >
          3D
        </button>
        {!is3DAllowed && (
          <span className="px-2 text-[9px] font-semibold uppercase tracking-wide text-amber-400">Desktop only</span>
        )}
      </div>

      {effectiveMode === '3d' ? (
        <Suspense
          fallback={
            <div className="relative flex h-full min-h-[580px] items-center justify-center rounded-3xl border border-white/5 bg-[#020617]">
              <div className="text-[10px] font-mono uppercase tracking-[0.32em] text-slate-500">Loading 3D Scene...</div>
            </div>
          }
        >
          <SimulationView3D state={state} />
        </Suspense>
      ) : (
        <SimulationView2D state={state} />
      )}
    </div>
  );
}
