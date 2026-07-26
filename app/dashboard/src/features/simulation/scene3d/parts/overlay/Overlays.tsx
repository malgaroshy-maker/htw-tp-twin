import { memo, useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { geometries } from '../../core/geometries';

/**
 * Edge geometry for the manual-mode zone boxes.
 *
 * The old implementation built `new THREE.BoxGeometry(...)` inside a `useMemo`
 * and never disposed it, then derived an `edgesGeometry` from it — so every
 * width/depth change leaked two geometries. There are only three zones, so
 * caching by size means at most three are ever created.
 */
const edgeCache = new Map<string, THREE.EdgesGeometry>();
function zoneEdges(width: number, depth: number) {
  const key = `${width}x${depth}`;
  let geo = edgeCache.get(key);
  if (!geo) {
    const box = new THREE.BoxGeometry(width, 0.1, depth);
    geo = new THREE.EdgesGeometry(box);
    box.dispose(); // the edges geometry has its own buffers now
    edgeCache.set(key, geo);
  }
  return geo;
}

export const ManualZoneHighlight = memo(function ManualZoneHighlight({
  position,
  width,
  depth,
  label,
  active,
}: {
  position: [number, number, number];
  width: number;
  depth: number;
  label: string;
  active: boolean;
}) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]} geometry={geometries().plane} scale={[width, depth, 1]}>
        <meshBasicMaterial color="#F59E0B" transparent opacity={active ? 0.12 : 0.04} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments geometry={zoneEdges(width, depth)}>
        <lineBasicMaterial attach="material" color="#F59E0B" transparent opacity={active ? 0.4 : 0.1} />
      </lineSegments>
      <Html position={[0, 0.25, depth / 2 + 0.4]} rotation={[-Math.PI / 2, 0, 0]} transform scale={0.02}>
        <div
          className={`whitespace-nowrap text-center text-[10px] font-black uppercase tracking-widest ${
            active ? 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'text-amber-900/60'
          }`}
        >
          {label}
        </div>
      </Html>
    </group>
  );
});

export const MaintenanceJogButton = memo(function MaintenanceJogButton({
  position,
  label,
  action,
  onJog,
}: {
  position: [number, number, number];
  label: string;
  action: string;
  onJog: (action: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      <Html center transform scale={0.03} zIndexRange={[100, 0]}>
        <button
          onClick={() => onJog(action)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`group flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 transition-all duration-300 backdrop-blur-md ${
            hovered
              ? 'border-amber-400 bg-amber-500/30 scale-105 shadow-lg shadow-amber-500/20'
              : 'border-white/10 bg-slate-900/80 scale-100'
          }`}
        >
          <div className={`h-1.5 w-1.5 rounded-full ${hovered ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`} />
          <span
            className={`text-[9px] font-black uppercase tracking-wider ${hovered ? 'text-white' : 'text-slate-300'}`}
          >
            {label}
          </span>
        </button>
      </Html>
    </group>
  );
});

export const ZoneLabel = memo(function ZoneLabel({
  position,
  label,
  active,
}: {
  position: [number, number, number];
  label: string;
  active: boolean;
}) {
  return (
    <Html position={position} center scale={0.02} className="pointer-events-none">
      <div
        className={`whitespace-nowrap text-center text-xs font-black uppercase tracking-widest transition-opacity duration-500 ${
          active
            ? 'text-emerald-400 opacity-90 drop-shadow-[0_0_12px_rgba(52,211,153,0.4)]'
            : 'text-slate-500 opacity-40'
        }`}
      >
        {label}
      </div>
    </Html>
  );
});

export const FlowArrow = memo(function FlowArrow({
  position,
  length,
  active,
  color = '#38BDF8',
  rotationY = 0,
}: {
  position: [number, number, number];
  length: number;
  active: boolean;
  color?: string;
  rotationY?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={geometries().plane} scale={[length, 0.24, 1]}>
        <meshBasicMaterial color={color} transparent opacity={active ? 0.34 : 0.12} />
      </mesh>
      <mesh position={[length / 2, 0.01, 0]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.28, 0.62, 3]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.6 : 0.16} />
      </mesh>
    </group>
  );
});
