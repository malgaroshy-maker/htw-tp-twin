import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Overview } from './features/overview/Overview';
import { Faults } from './features/faults/Faults';
import { Recipe } from './features/recipe/Recipe';
import { Diagnostics } from './features/diagnostics/Diagnostics';

const ThreeDSimPage = lazy(async () => {
  const module = await import('./features/simulation/ThreeDSimPage');
  return { default: module.ThreeDSimPage };
});

// Placeholder components for other screens
const Production = () => (
  <div className="p-8">
    <h2 className="text-2xl font-black uppercase tracking-tight mb-4">Production & Counters</h2>
    <p className="text-slate-500 font-mono uppercase tracking-widest">Screen under development</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
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
          <Route path="/" element={<Overview />} />
          <Route path="/faults" element={<Faults />} />
          <Route path="/production" element={<Production />} />
          <Route path="/recipe" element={<Recipe />} />
          <Route path="/diagnostics" element={<Diagnostics />} />
          </Route>
        </Routes>
    </BrowserRouter>
  );
}

export default App;
