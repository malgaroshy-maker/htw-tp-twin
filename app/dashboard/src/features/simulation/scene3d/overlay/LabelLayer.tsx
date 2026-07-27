import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface SceneLabel {
  id: string;
  position: [number, number, number];
  text: string;
  active: boolean;
  kind?: 'zone' | 'sensor';
}

/**
 * Projects world-space label anchors to screen coordinates and writes them onto
 * a plain DOM layer that lives *outside* the Canvas.
 *
 * drei's `<Html>` mounts a React subtree per label and runs its own `useFrame`
 * to reposition it — 13 of those meant 13 per-frame layout-triggering DOM
 * writes and 13 extra React trees inside the R3F reconciler. This projects all
 * of them in one pass, at ~8 Hz rather than per frame: the camera is static
 * between user interactions, so label positions do not need frame-rate updates.
 */
const UPDATE_INTERVAL = 1 / 8;

export function LabelProjector({
  labels,
  containerRef,
}: {
  labels: SceneLabel[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { camera, size } = useThree();
  const accum = useRef(0);
  const vec = useRef(new THREE.Vector3());
  const nodes = useRef<Map<string, HTMLElement>>(new Map());

  // Build one DOM node per label, reused across updates.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const map = nodes.current;

    for (const label of labels) {
      if (map.has(label.id)) continue;
      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.transform = 'translate(-50%, -50%)';
      el.style.whiteSpace = 'nowrap';
      el.style.pointerEvents = 'none';
      el.style.willChange = 'transform';
      container.appendChild(el);
      map.set(label.id, el);
    }

    // Drop nodes for labels that no longer exist.
    const live = new Set(labels.map((l) => l.id));
    for (const [id, el] of map) {
      if (!live.has(id)) {
        el.remove();
        map.delete(id);
      }
    }

    return () => {
      for (const el of map.values()) el.remove();
      map.clear();
    };
  }, [labels, containerRef]);

  useFrame((_, delta) => {
    accum.current += delta;
    if (accum.current < UPDATE_INTERVAL) return;
    accum.current = 0;

    for (const label of labels) {
      const el = nodes.current.get(label.id);
      if (!el) continue;

      vec.current.set(...label.position).project(camera);
      const behind = vec.current.z > 1;
      if (behind) {
        el.style.display = 'none';
        continue;
      }

      const x = (vec.current.x * 0.5 + 0.5) * size.width;
      const y = (-vec.current.y * 0.5 + 0.5) * size.height;
      el.style.display = '';
      el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;

      const cls =
        label.kind === 'sensor'
          ? 'text-[10px] font-extrabold tracking-[0.1em] '
          : 'text-xs font-black uppercase tracking-widest ';
      const tone = label.active
        ? label.kind === 'sensor'
          ? 'text-sky-300'
          : 'text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.4)]'
        : 'text-slate-500 opacity-40';
      const next = cls + tone;
      if (el.className !== next) el.className = next;
      if (el.textContent !== label.text) el.textContent = label.text;
    }
  });

  return null;
}
