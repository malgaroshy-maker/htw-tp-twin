import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Overview } from './features/overview/Overview';
import { Control } from './features/control/Control';
import { Faults } from './features/faults/Faults';
import { Recipe } from './features/recipe/Recipe';
import { Diagnostics } from './features/diagnostics/Diagnostics';
import { Production } from './features/production/Production';
import { Training } from './features/training/Training';
import { History } from './features/history/History';
import { SimulatorProvider } from './hooks/SimulatorProvider';

const ThreeDSimPage = lazy(async () => {
  const module = await import('./features/simulation/ThreeDSimPage');
  return { default: module.ThreeDSimPage };
});

function App() {
  return (
    <BrowserRouter>
      <SimulatorProvider>
        <Routes>
          <Route
            path="/3dsim"
            element={(
              <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-500 flex items-center justify-center text-[10px] font-mono uppercase tracking-[0.3em]">Loading 3D Viewer...</div>}>
                <ThreeDSimPage />
              </Suspense>
            )}
          />
          <Route element={<Layout />}>
            <Route path="/"            element={<Overview />} />
            <Route path="/control"    element={<Control />} />
            <Route path="/faults"     element={<Faults />} />
            <Route path="/production" element={<Production />} />
            <Route path="/recipe"     element={<Recipe />} />
            <Route path="/diagnostics" element={<Diagnostics />} />
            <Route path="/training"   element={<Training />} />
            <Route path="/history"    element={<History />} />
          </Route>
        </Routes>
      </SimulatorProvider>
    </BrowserRouter>
  );
}

export default App;
