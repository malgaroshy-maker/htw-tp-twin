import React from 'react';

interface ConveyorProps {
  x: number;
  y: number;
  width: number;
  height: number;
  active?: boolean;
  speed?: number; // 0 to 1
  variant?: 'belt' | 'chain';
  lanes?: number;
}

export const Conveyor: React.FC<ConveyorProps> = ({ 
  x, y, width, height, 
  active = false, 
  speed = 1,
  variant = 'belt',
  lanes = 0
}) => {
  const isChain = variant === 'chain';
  const duration = (2 / speed).toFixed(2);
  const laneHeight = height / (lanes || 1);
  
  return (
    <g className={`conveyor ${isChain ? 'conveyor-chain' : ''}`}>
      {/* Structural Bed Surround */}
      <rect x={x} y={y - 2} width={width} height={height + 4} fill="#1E293B" rx={2} fillOpacity={0.2} />
      
      {/* Side Plates */}
      <rect x={x} y={y - 2} width={width} height={3} fill="#475569" rx={1} />
      <rect x={x} y={y + height - 1} width={width} height={3} fill="#475569" rx={1} />

      {/* Main Surface */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="#0F172A"
      />
      
      {/* Lane Dividers */}
      {lanes > 1 && Array.from({length: lanes - 1}).map((_, i) => (
        <line 
          key={i}
          x1={x} y1={y + (i + 1) * laneHeight}
          x2={x + width} y2={y + (i + 1) * laneHeight}
          stroke="#334155"
          strokeWidth={1}
          strokeDasharray={isChain ? "none" : "2 4"}
        />
      ))}

      {/* Belt/Chain Surface animation */}
      {!isChain && (
        <rect
          x={x} y={y} width={width} height={height}
          fill="url(#belt-texture)"
          className={active ? 'conveyor-belt-flow' : ''}
          style={{ animationDuration: `${duration}s` } as any}
        />
      )}
      
      {/* Transport Lugs (Flight Bars) for Chains */}
      {isChain && (
        <g className={active ? 'conveyor-chain-move' : ''} style={{ animationDuration: `${duration}s` } as any}>
          {Array.from({ length: Math.ceil(width / 40) + 1 }).map((_, i) => (
            <g key={i} transform={`translate(${i * 40}, 0)`}>
               <rect 
                 x={x} y={y} 
                 width={3} height={height} 
                 fill="#94A3B8" 
                 fillOpacity={0.4}
               />
               <rect x={x-1} y={y} width={5} height={4} fill="#64748B" rx={1} />
               <rect x={x-1} y={y + height - 4} width={5} height={4} fill="#64748B" rx={1} />
            </g>
          ))}
        </g>
      )}

      {/* Visual Slats/Rollers details */}
      <g opacity={0.2}>
        {Array.from({ length: Math.floor(width / 15) }).map((_, i) => (
          <rect
            key={i}
            x={x + i * 15 + 5}
            y={y + 1}
            width={1}
            height={height - 2}
            fill="#94A3B8"
          />
        ))}
      </g>
    </g>
  );
};
