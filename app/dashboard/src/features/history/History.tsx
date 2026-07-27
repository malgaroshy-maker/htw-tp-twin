import { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import {
  History as HistoryIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Database,
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

interface Session {
  session_id: string;
  started_at: string;
  ended_at: string | null;
  recipe_id: string;
  event_count: number;
  fault_count: number;
  warn_count: number;
}

interface HistoryEvent {
  id: number;
  event_id: string;
  ts: string;
  session_id: string;
  event_code: string;
  category: string;
  severity: string;
  machine_state: string;
  machine_mode: string;
  recipe_id: string;
  message: string;
  scenario_id: string;
  metadata: Record<string, unknown>;
}

const SEV_STYLES: Record<string, string> = {
  FAULT:   'bg-red-500/10 border-red-500/30 text-red-400',
  WARNING: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  INFO:    'bg-slate-800/40 border-slate-700/40 text-slate-400',
};

const SEV_DOT: Record<string, string> = {
  FAULT:   'bg-red-400',
  WARNING: 'bg-amber-400',
  INFO:    'bg-slate-500',
};

function EventRow({ event }: { event: HistoryEvent }) {
  const sev = event.severity.toUpperCase();
  const dot = SEV_DOT[sev] ?? 'bg-slate-600';
  const ts = event.ts ? new Date(event.ts).toLocaleString() : '—';

  return (
    <div className={`flex items-center gap-4 px-4 py-2.5 rounded-lg border transition-all hover:brightness-110 ${SEV_STYLES[sev] ?? SEV_STYLES.INFO}`}>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black font-mono text-slate-200 truncate">{event.event_code}</span>
          {event.scenario_id && (
            <span className="text-[8px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded font-bold uppercase">
              {event.scenario_id}
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-500 truncate block">{event.message}</span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 text-right">
        <span className="text-[9px] text-slate-500 font-mono hidden sm:block">{event.machine_state}</span>
        <span className="text-[9px] font-mono text-slate-600">{ts}</span>
      </div>
    </div>
  );
}

function SessionCard({
  session,
  isSelected,
  onSelect,
}: {
  session: Session;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const dur =
    session.ended_at
      ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000)
      : null;

  return (
    <button
      onClick={() => onSelect(session.session_id)}
      className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
        isSelected
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-slate-900/40 border-slate-800/50 hover:border-slate-700/70'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider font-mono truncate max-w-[140px]">
          {session.session_id.slice(0, 8)}…
        </span>
        {session.ended_at ? (
          <Badge variant="neutral" className="text-[8px]">CLOSED</Badge>
        ) : (
          <Badge variant="success" className="text-[8px] animate-pulse">● LIVE</Badge>
        )}
      </div>
      <div className="text-[9px] text-slate-500 mb-2">
        {new Date(session.started_at).toLocaleString()}
        {dur !== null && ` · ${dur}s`}
      </div>
      <div className="flex gap-3 text-[9px] font-black">
        <span className="text-slate-400">{session.event_count} events</span>
        {session.fault_count > 0 && <span className="text-red-400">{session.fault_count} faults</span>}
        {session.warn_count > 0 && <span className="text-amber-400">{session.warn_count} warns</span>}
      </div>
    </button>
  );
}

const PAGE_SIZE = 50;

export function History() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/sessions?limit=30`);
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch {
      /* silently fail */
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async (sid: string | null, sev: string, off: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(off) });
      if (sid) params.append('session_id', sid);
      if (sev) params.append('severity', sev);
      const res = await fetch(`${API_BASE}/history/events?${params.toString()}`);
      const data = await res.json();
      setEvents(data.events ?? []);
      setTotal(data.count ?? 0);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    setOffset(0);
    fetchEvents(selectedSession, severityFilter, 0);
  }, [selectedSession, severityFilter, fetchEvents]);

  const handlePage = (dir: 1 | -1) => {
    const next = Math.max(0, offset + dir * PAGE_SIZE);
    setOffset(next);
    fetchEvents(selectedSession, severityFilter, next);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="flex-1 flex flex-col p-8 gap-8 w-full bg-slate-950 overflow-y-auto">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-6 mb-2">
        <div className="flex items-center gap-4">
          <div className="bg-cyan-500/20 p-3 rounded-xl border border-cyan-500/30">
            <HistoryIcon className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white">Session History</h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">
              Persistent SQLite Log · Paginated · Filterable
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="border border-slate-700 text-slate-400 hover:text-slate-200"
          onClick={fetchSessions}
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Sessions Sidebar */}
        <div className="xl:col-span-1 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Database className="w-3 h-3" /> Sessions
            </span>
            <span className="text-[9px] text-slate-600 font-mono">{sessions.length} total</span>
          </div>

          {sessionsLoading ? (
            <div className="text-center py-8 text-slate-600 text-xs">Loading…</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-xs">
              No sessions persisted yet. Start and stop the machine to generate history.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setSelectedSession(null)}
                className={`text-left px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                  !selectedSession
                    ? 'bg-slate-700/50 border-slate-600 text-slate-200'
                    : 'border-slate-800/50 text-slate-500 hover:border-slate-700/70 hover:text-slate-400'
                }`}
              >
                All Sessions
              </button>
              {sessions.map((s) => (
                <SessionCard
                  key={s.session_id}
                  session={s}
                  isSelected={selectedSession === s.session_id}
                  onSelect={setSelectedSession}
                />
              ))}
            </div>
          )}
        </div>

        {/* Events Table */}
        <div className="xl:col-span-3 flex flex-col gap-4">
          {/* Filter Bar */}
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
            {(['', 'FAULT', 'WARNING', 'INFO'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
                  severityFilter === sev
                    ? sev === 'FAULT'
                      ? 'bg-red-500/20 border-red-500/40 text-red-300'
                      : sev === 'WARNING'
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : sev === 'INFO'
                      ? 'bg-slate-700/50 border-slate-600 text-slate-200'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'
                }`}
              >
                {sev || 'All'}
              </button>
            ))}
            <span className="ml-auto text-[10px] font-mono text-slate-500">{loading ? 'Loading…' : `${total} events`}</span>
          </div>

          <Card title="Event Log" className="border-slate-800/50 bg-slate-900/40">
            {events.length === 0 && !loading ? (
              <div className="text-center py-16">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                <p className="text-sm text-slate-600">No events matching this filter.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {events.map((evt, i) => (
                  <EventRow key={`${evt.event_id}-${i}`} event={evt} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800">
                <Button
                  variant="ghost"
                  size="sm"
                  className="border border-slate-700"
                  disabled={offset === 0}
                  onClick={() => handlePage(-1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-[10px] font-mono text-slate-500">
                  Page {currentPage} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="border border-slate-700"
                  disabled={offset + PAGE_SIZE >= total}
                  onClick={() => handlePage(1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </Card>

          {/* Stats Row */}
          {selectedSession && sessions.find((s) => s.session_id === selectedSession) && (() => {
            const s = sessions.find((s) => s.session_id === selectedSession)!;
            return (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total Events', value: s.event_count, icon: <Clock className="w-4 h-4" />, color: 'text-slate-300' },
                  { label: 'Faults', value: s.fault_count, icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-400' },
                  { label: 'Warnings', value: s.warn_count, icon: <AlertTriangle className="w-4 h-4" />, color: 'text-amber-400' },
                ].map(({ label, value, icon, color }) => (
                  <div key={label} className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`${color} opacity-60`}>{icon}</span>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
                    </div>
                    <span className={`text-2xl font-black font-mono ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
