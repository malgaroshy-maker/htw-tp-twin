import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';

declare global {
  interface Window {
    __sceneStats?: {
      calls: number;
      triangles: number;
      programs: number;
      geometries: number;
      textures: number;
      fps: number;
    };
  }
}

/**
 * Dev-only probe. Publishes renderer counters on `window.__sceneStats` once a
 * second so the Playwright harness can assert draw calls / geometry count
 * without a UI.
 *
 * Mounted only behind `?perf=1`, so it costs nothing in normal use.
 *
 * `fps` is only meaningful on real GPU hardware — under headless Chromium it
 * reflects software rasterisation and should not be quoted as a perf figure.
 */
export function SceneStats() {
  const { gl } = useThree();
  const frames = useRef(0);
  const windowStart = useRef(0);

  useFrame(() => {
    const now = performance.now();
    if (windowStart.current === 0) {
      windowStart.current = now;
      return;
    }

    frames.current += 1;
    const elapsed = now - windowStart.current;
    if (elapsed < 1000) return;

    window.__sceneStats = {
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      programs: gl.info.programs?.length ?? 0,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      fps: Math.round((frames.current / elapsed) * 1000),
    };

    frames.current = 0;
    windowStart.current = now;
  });

  return null;
}
