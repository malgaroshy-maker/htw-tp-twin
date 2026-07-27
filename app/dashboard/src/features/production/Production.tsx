import { useSimulator } from '../../hooks/useSimulator';
import { Card } from '../../components/Card';
import { Activity, BarChart2, TrendingUp, Clock, CheckCircle2, XCircle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

// Static baseline history for chart display until Phase 3 SQLite persistence is ready.
// Values represent a realistic session trend. Replaced Math.random() to ensure
// React rendering purity and stable ESLint compliance.
const STATIC_GOOD_BASE =    [102,108,115,110,118,122,119,124,128,121,130,126,133,129,135,138,131,140,142,145];
const STATIC_REJECTS_BASE = [  1,  0,  2,  1,  0,  1,  0,  2,  1,  0,  1,  0,  3,  1,  0,  1,  0,  2,  1,  0];
const STATIC_TPUT_BASE =    [182,186,190,185,192,195,191,197,200,193,202,198,205,201,206,208,199,210,212,214];

const mockHistoryData = STATIC_GOOD_BASE.map((good, i) => ({
  time: `-${20 - i}m`,
  good,
  rejects: STATIC_REJECTS_BASE[i],
  throughput: STATIC_TPUT_BASE[i],
}));

export function Production() {
  const { state } = useSimulator();

  if (!state) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Activity className="w-12 h-12 text-slate-800 animate-pulse mx-auto mb-4" />
          <p className="text-slate-500 font-mono uppercase tracking-widest">Connecting to Simulator...</p>
        </div>
      </div>
    );
  }

  const { out } = state;
  const goodPackCount = out.good_pack_count || 0;
  const rejectPackCount = out.reject_pack_count || 0;
  const totalPacks = goodPackCount + rejectPackCount;
  
  const rejectRate = totalPacks > 0 ? (rejectPackCount / totalPacks) * 100 : 0;
  
  // Calculate running states based on current out metrics
  const runtime_min = (out.runtime_sec / 60).toFixed(1);
  const throughput = runtime_min !== "0.0" ? (goodPackCount / parseFloat(runtime_min)).toFixed(1) : 0;

  return (
    <div className="flex-1 flex flex-col p-8 gap-8 w-full bg-slate-950">
      <header className="flex items-center gap-4 border-b border-slate-800 pb-6 mb-2">
        <div className="bg-indigo-500/20 p-3 rounded-xl border border-indigo-500/30">
          <BarChart2 className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">Production Analytics</h1>
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">Live Throughput & KPI Dashboard</p>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Good Packs</p>
              <p className="text-3xl font-black text-white">{goodPackCount.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        
        <Card className="border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-lg">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rejected Packs</p>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-black text-red-400">{rejectPackCount.toLocaleString()}</p>
                <div className="text-sm font-bold text-red-500/70 mb-1">
                  {rejectRate.toFixed(1)}% Rate
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-sky-500/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Throughput</p>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-black text-white">{throughput}</p>
                <div className="text-[10px] font-bold text-slate-500 mb-1 uppercase">Packs/Min</div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-lg">
              <Clock className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Machine Runtime</p>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-black text-white">{runtime_min}</p>
                <div className="text-[10px] font-bold text-slate-500 mb-1 uppercase">Minutes</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Array */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Throughput Trend (Packs / Min)" className="border-slate-800/50 bg-[#0C1118]">
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockHistoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="throughput" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#colorThroughput)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Production Quality Distribution" className="border-slate-800/50 bg-[#0C1118]">
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockHistoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  cursor={{ fill: '#1e293b', opacity: 0.4 }}
                />
                <Bar dataKey="good" name="Good Packs" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="rejects" name="Rejects" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

    </div>
  );
}
