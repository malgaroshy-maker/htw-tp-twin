import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import type { SimulatorState, RecipeInfo, ScenarioInfo } from './simTypes';

export interface EventRecord {
  event_id: string;
  ts: string;
  event_code: string;
  category: string;
  severity: string;
  machine_state: string;
  machine_mode: string;
  recipe_id: string;
  message: string;
  session_id: string;
  scenario_id: string;
  metadata: Record<string, unknown>;
}

const API_BASE = 'http://localhost:8000';

/**
 * Owns the single polling loop and all simulator state.
 *
 * Call this exactly once, from `SimulatorProvider`. Every consumer reads the
 * result through `useSimulator()` instead, so the app runs one `/state` poll
 * rather than one per component.
 */
export function useSimulatorStore() {
  const [state, setState] = useState<SimulatorState | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [recipes, setRecipes] = useState<RecipeInfo[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [isCommsHealthy, setIsCommsHealthy] = useState(false);
  const [isAutoTickEnabled, setIsAutoTickEnabled] = useState(false);
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<{ output: string; loading: boolean } | null>(null);
  
  const autoTickIntervalRef = useRef<number | null>(null);

  const fetchScenarios = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/scenarios`);
      if (!response.ok) throw new Error('Failed to fetch scenarios');
      const data = await response.json();
      setScenarios(data.scenarios);
    } catch (err) {
      console.error('Failed to fetch scenarios:', err);
    }
  }, []);

  const fetchRecipes = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/recipes`);
      if (!response.ok) throw new Error('Failed to fetch recipes');
      const data = await response.json();
      setRecipes(data.recipes);
    } catch (err) {
      console.error('Failed to fetch recipes:', err);
    }
  }, []);

  const selectRecipe = useCallback(async (recipeId: string) => {
    try {
      const response = await fetch(`${API_BASE}/recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_id: recipeId }),
      });
      const data = await response.json();
      if (data.state) setState(data.state);
      return data;
    } catch {
      console.error('Recipe selection error');
      return { accepted: false, error: 'Network error' };
    }
  }, []);

  const updateRecipe = useCallback(async (updates: Partial<RecipeInfo> & { recipe_id: string }) => {
    try {
      const response = await fetch(`${API_BASE}/recipe/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (data.state) setState(data.state);
      await fetchRecipes(); // refresh the local list
      return data;
    } catch (err) {
      console.error('Update recipe error:', err);
      return { status: 'error', error: 'Network error' };
    }
  }, [fetchRecipes]);

  const sendCommand = useCallback(async (action: string) => {
    try {
      const response = await fetch(`${API_BASE}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (data.state) setState(data.state);
      return data;
    } catch (err) {
      console.error('Command error:', err);
      return { accepted: false, error: 'Network error' };
    }
  }, []);

  const resetSession = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/session/reset`, { method: 'POST' });
      const data = await response.json();
      if (data.state) setState(data.state);
      setEvents([]);
      return data;
    } catch (err) {
      console.error('Reset session error:', err);
    }
  }, []);

  const startScenario = useCallback(async (scenarioId: string) => {
    try {
      const response = await fetch(`${API_BASE}/scenario/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioId }),
      });
      const data = await response.json();
      if (data.state) setState(data.state);
      return data;
    } catch (err) {
      console.error('Start scenario error:', err);
    }
  }, []);

  const stopScenario = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/scenario/stop`, { method: 'POST' });
      const data = await response.json();
      if (data.state) setState(data.state);
      return data;
    } catch (err) {
      console.error('Stop scenario error:', err);
    }
  }, []);

  const fetchReport = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/reports/session?format=markdown`);
      const data = await response.text();
      setActiveReport(data);
    } catch (err) {
      console.error('Fetch report error:', err);
    }
  }, []);

  const askAi = useCallback(async (endpoint: 'explain-state' | 'explain-fault' | 'session-summary') => {
    setAiResponse({ output: '', loading: true });
    try {
      const response = await fetch(`${API_BASE}/ai/${endpoint}`);
      const data = await response.json();
      setAiResponse({ output: data.model_output, loading: false });
    } catch {
      setAiResponse({ output: 'AI Assistant error: Failed to reach API', loading: false });
    }
  }, []);

  const tick = useCallback(async (dt: number = 0.1) => {
    try {
      const response = await fetch(`${API_BASE}/tick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dt }),
      });
      const data = await response.json();
      setState(data);
    } catch (err) {
      console.error('Tick error:', err);
    }
  }, []);

  const setInput = useCallback(async (name: string, value: boolean) => {
    try {
      const response = await fetch(`${API_BASE}/dev/set-input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, value }),
      });
      const data = await response.json();
      if (data.state) setState(data.state);
      return data;
    } catch (err) {
      console.error('Set input error:', err);
      return { status: 'error', error: 'Network error' };
    }
  }, []);

  // Live state/events via WebSocket; recipes/scenarios stay on HTTP (low-frequency config)
  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    const connect = () => {
      if (disposed) return;
      const wsUrl = `${API_BASE.replace('http', 'ws')}/ws/state`;
      socket = new WebSocket(wsUrl);

      socket.onmessage = (msg) => {
        try {
          const payload = JSON.parse(msg.data);
          if (payload.state) setState(payload.state);
          if (payload.events) setEvents(payload.events);
          setIsCommsHealthy(true);
        } catch (err) {
          console.error('WS message parse error:', err);
        }
      };

      socket.onclose = () => {
        if (disposed) return;
        setIsCommsHealthy(false);
        reconnectTimer = window.setTimeout(connect, 1000);
      };

      socket.onerror = () => {
        setIsCommsHealthy(false);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, []);

  // Initial config fetch (state arrives via the first WS push)
  useEffect(() => {
    fetchScenarios();
    fetchRecipes();
  }, [fetchScenarios, fetchRecipes]);

  // Auto-tick logic
  useEffect(() => {
    if (isAutoTickEnabled) {
      autoTickIntervalRef.current = window.setInterval(() => {
        tick(0.1);
      }, 100);
    } else if (autoTickIntervalRef.current) {
      clearInterval(autoTickIntervalRef.current);
      autoTickIntervalRef.current = null;
    }
    return () => {
      if (autoTickIntervalRef.current) clearInterval(autoTickIntervalRef.current);
    };
  }, [isAutoTickEnabled, tick]);

  return {
    state,
    events,
    recipes,
    scenarios,
    isCommsHealthy,
    isAutoTickEnabled,
    setIsAutoTickEnabled,
    activeReport,
    setActiveReport,
    aiResponse,
    setAiResponse,
    sendCommand,
    resetSession,
    selectRecipe,
    startScenario,
    stopScenario,
    fetchReport,
    askAi,
    tick,
    setInput,
    updateRecipe,
  };
}

export type SimulatorStore = ReturnType<typeof useSimulatorStore>;

export const SimulatorContext = createContext<SimulatorStore | null>(null);

/**
 * Read the shared simulator state. Requires a `SimulatorProvider` above it,
 * which App.tsx mounts once around the whole router.
 */
export function useSimulator(): SimulatorStore {
  const store = useContext(SimulatorContext);
  if (!store) {
    throw new Error('useSimulator must be used inside a <SimulatorProvider>');
  }
  return store;
}
