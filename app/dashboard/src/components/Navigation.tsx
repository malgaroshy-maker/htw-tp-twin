import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertOctagon,
  BarChart3,
  BookOpen,
  Settings2,
  HelpCircle,
  Box,
  Cpu,
  GraduationCap,
  ScrollText,
} from 'lucide-react';
import { cn } from '../utils';

// HMI spec order: Overview → Control → Faults → Production → Recipe → Diagnostics → Training → 3D Sim
const navItems = [
  { to: '/',            label: 'Overview',    icon: LayoutDashboard },
  { to: '/control',    label: 'Control',     icon: Cpu },
  { to: '/faults',     label: 'Faults',      icon: AlertOctagon },
  { to: '/production', label: 'Production',  icon: BarChart3 },
  { to: '/recipe',     label: 'Recipe',      icon: BookOpen },
  { to: '/diagnostics',label: 'Diagnostics', icon: Settings2 },
  { to: '/training',   label: 'Training',    icon: GraduationCap },
  { to: '/history',    label: 'History',     icon: ScrollText },
  { to: '/3dsim',      label: '3D Sim',      icon: Box },
];

export function Navigation() {
  const location = useLocation();
  return (
    <nav className="w-20 bg-slate-950 border-r border-slate-800/50 flex flex-col items-center py-8 z-50">
      {/* Brand Icon */}
      <div className="mb-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <span className="text-white font-black text-xl italic">T</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            className={({ isActive }) => cn(
              "p-3 rounded-xl transition-all duration-300 group flex items-center justify-center relative",
              isActive
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                : "text-slate-500 hover:bg-slate-800/50 hover:text-slate-300 border border-transparent"
            )}
          >
            <item.icon className="w-5 h-5" strokeWidth={1.5} />

            {/* Active Indicator Dot */}
            <div
              className={cn(
                "absolute -left-1 w-1 h-4 bg-emerald-500 rounded-r-full transition-transform duration-300 scale-y-0",
                location.pathname === item.to && "scale-y-100"
              )}
            />
          </NavLink>
        ))}
      </div>

      {/* Bottom Help Button */}
      <div className="mt-auto pb-6">
        <button
          title="Help"
          className="p-3 rounded-xl text-slate-600 hover:text-slate-400 hover:bg-slate-800/50 transition-all"
        >
          <HelpCircle className="w-5 h-5" strokeWidth={1.5} />
        </button>
      </div>
    </nav>
  );
}
