import { cn } from '../utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'warning';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  disabled,
  ...props 
}: ButtonProps) {
  const baseStyles = 'font-hmi font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 border active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]',
    secondary: 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white',
    warning: 'bg-amber-600 border-amber-500 text-black hover:bg-amber-500 hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]',
    danger: 'bg-red-700 border-red-600 text-white hover:bg-red-600 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]',
    ghost: 'bg-transparent border-transparent text-slate-500 hover:bg-slate-800 hover:text-slate-300',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[10px] rounded-md',
    md: 'px-5 py-2.5 text-xs rounded-lg',
    lg: 'px-8 py-4 text-sm rounded-xl',
  };

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
