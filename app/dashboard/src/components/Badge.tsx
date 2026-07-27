import { cn } from '../utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-slate-800 text-slate-400 border-slate-700',
    neutral: 'bg-slate-700 text-slate-300 border-slate-600',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]',
    danger: 'bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]',
    info: 'bg-sky-500/10 text-sky-400 border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.1)]',
  };

  return (
    <span className={cn(
      'px-2.5 py-0.5 rounded border text-[10px] font-hmi font-bold uppercase tracking-wider transition-all duration-300', 
      variants[variant], 
      className
    )}>
      {children}
    </span>
  );
}
