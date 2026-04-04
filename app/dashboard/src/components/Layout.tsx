import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';
import { useSimulator } from '../hooks/useSimulator';

interface LayoutProps {
  children?: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isAutoTickEnabled, setIsAutoTickEnabled } = useSimulator();

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 overflow-hidden">
      <Navigation />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Developer Tools Bar */}
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-1.5 flex justify-end items-center gap-4 text-xs shrink-0">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Developer Tools</span>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input 
              type="checkbox" 
              className="sr-only" 
              checked={isAutoTickEnabled}
              onChange={(e) => setIsAutoTickEnabled(e.target.checked)}
            />
            <div className={`w-6 h-3 rounded-full transition-colors ${isAutoTickEnabled ? 'bg-amber-500' : 'bg-slate-700'}`}>
              <div className={`w-2 h-2 bg-white rounded-full mt-0.5 transition-transform ${isAutoTickEnabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-[9px] font-bold text-slate-500 group-hover:text-slate-400 uppercase tracking-widest">Auto-Tick</span>
          </label>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
