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
 * to reposition it — 13 of those meant 13 extra React trees inside the R3F
 * reconciler. This projects all of them in one pass.
 *
 * The projection runs **every frame**. An earlier version throttled it to 8 Hz
 * on the theory that a static camera does not need frame-rate updates, but
 * OrbitControls damping means the camera keeps moving after input stops, so the
 * labels visibly stepped and flickered against the scene. Projecting twelve
 * points is a handful of multiplications; the cost the original `<Html>` carried
 * was React reconciliation, not the maths.
 *
 * Writes are still skipped when nothing changed, so a genuinely static camera
 * touches the DOM zero times per frame.
 */
/** Sub-pixel moves are not worth a style write. */
const MOVE_EPSILON = 0.25;

export function LabelProjector({
  labels,
  containerRef,
}: {
  labels: SceneLabel[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { camera, size } = useThree();
  const vec = useRef(new THREE.Vector3());
  const nodes = useRef<Map<string, HTMLElement>>(new Map());
  /** Last written screen position per label, to skip no-op DOM writes. */
  const lastXY = useRef<Map<string, [number, number]>>(new Map());

  /*
   * Node identity is keyed on the label IDs, not on the array.
   *
   * `labels` is rebuilt from the simulator snapshot, so its identity changes on
   * every poll. Depending on it tore down and recreated all twelve nodes twice a
   * second, leaving them blank until the next frame projected them — which is
   * what made the labels flicker, and at low projection rates made them vanish.
   * The IDs are fixed, so this effect now runs once.
   */
  const labelKey = labels.map((l) => l.id).join('|');

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
    // labelKey covers the only thing that should rebuild nodes: the set of IDs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelKey, containerRef]);

  useFrame(() => {
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

      if (el.style.display === 'none') el.style.display = '';
      const prev = lastXY.current.get(label.id);
      if (!prev || Math.abs(prev[0] - x) > MOVE_EPSILON || Math.abs(prev[1] - y) > MOVE_EPSILON) {
        lastXY.current.set(label.id, [x, y]);
        el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      }

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
