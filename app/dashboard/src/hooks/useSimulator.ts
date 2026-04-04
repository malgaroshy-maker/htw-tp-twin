import { useState, useEffect, useCallback, useRef } from 'react';
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
  metadata: Record<string, any>;
}

const API_BASE = 'http://localhost:8000';

export function useSimulator() {
  const [state, setState] = useState<SimulatorState | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [recipes, setRecipes] = useState<RecipeInfo[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [isCommsHealthy, setIsCommsHealthy] = useState(false);
  const [isAutoTickEnabled, setIsAutoTickEnabled] = useState(false);
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<{ output: string; loading: boolean } | null>(null);
  
  const autoTickIntervalRef = useRef<number | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/state`);
      if (!response.ok) throw new Error('Failed to fetch state');
      const data = await response.json();
      setState(data);
      setIsCommsHealthy(true);
    } catch (err) {
      console.error('Comms error:', err);
      setIsCommsHealthy(false);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/events?limit=5`);
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data.events);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  }, []);

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

  // Polling for state and events
  useEffect(() => {
    let mounted = true;
    
    // Immediate fetch to avoid flicker
    const init = async () => {
      await fetchScenarios();
      await fetchRecipes();
      await fetchState();
      await fetchEvents();
    };
    init();

    const interval = setInterval(() => {
      if (mounted) {
        fetchState();
        fetchEvents();
      }
    }, 500);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fetchState, fetchEvents, fetchScenarios, fetchRecipes]);

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
  };
}
