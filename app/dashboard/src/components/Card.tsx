import { cn } from '../utils';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function Card({ children, title, className }: CardProps) {
  return (
    <div className={cn('bg-[#0C1118]/80 border border-slate-900 shadow-2xl overflow-hidden rounded-xl backdrop-blur-md', className)}>
      {title && (
        <div className="px-5 py-3 border-b border-slate-900/50 bg-slate-900/30 flex items-center justify-between">
          <h3 className="text-[10px] font-hmi font-bold text-slate-500 uppercase tracking-[0.2em]">{title}</h3>
          <div className="flex gap-1">
             <div className="w-1 h-1 rounded-full bg-slate-800" />
             <div className="w-1 h-1 rounded-full bg-slate-800" />
          </div>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
