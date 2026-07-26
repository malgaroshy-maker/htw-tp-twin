import { cn } from '../utils';

interface StatusIndicatorProps {
  active: boolean;
  label: string;
  className?: string;
}

export function StatusIndicator({ active, label, className }: StatusIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2 px-2 py-1 rounded bg-slate-900 shadow-inner border border-slate-800', className)}>
      <div 
        className={cn(
          'w-2 h-2 rounded-full transition-all duration-500', 
          active 
            ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' 
            : 'bg-red-500/20 border border-red-500/50'
        )} 
      />
      <span className="text-[9px] font-hmi font-bold uppercase tracking-[0.2em] text-slate-500">{label}</span>
    </div>
  );
}
