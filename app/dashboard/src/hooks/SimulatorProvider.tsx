import type { ReactNode } from 'react';
import { SimulatorContext, useSimulatorStore } from './useSimulator';

/**
 * Mounts the one and only simulator polling loop and shares it with the tree.
 *
 * Every screen used to call `useSimulator()` directly, which meant a separate
 * 500 ms `/state` poll and a separate state tree per screen. Consumers now read
 * this single store, so `isAutoTickEnabled` is genuinely global and the 3D scene
 * re-renders once per snapshot instead of once per mounted consumer.
 */
export function SimulatorProvider({ children }: { children: ReactNode }) {
  const store = useSimulatorStore();
  return <SimulatorContext.Provider value={store}>{children}</SimulatorContext.Provider>;
}
