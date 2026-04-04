import React from 'react';

interface PusherProps {
  progress: number;
  active: boolean;
}

export const Pusher: React.FC<PusherProps> = ({ progress, active }) => {
  // Horizontal movement range (from GROUPING zone edge towards PACK ZONE center)
  const tx = active ? (progress * 160) : 0;
  
  return (
    <g className="pusher-arm" transform={`translate(${tx}, 0)`}>
      {/* Heavy Vertical Bar (Pushes products) */}
      <rect 
        x={0} y={0} 
        width={8} height={80} 
        fill="url(#mechanical-metallic)" 
        rx={2} 
        stroke="#0F172A" 
        strokeWidth={1} 
      />
      
      {/* Horizontal Pneumatic Cylinder (Extends bar) */}
      <rect 
        x={-200} y={35} 
        width={200} height={10} 
        fill="#334155" 
        fillOpacity={0.8}
        rx={2}
      />
      
      {/* Piston Rod */}
      <rect 
        x={-tx} y={38} 
        width={tx} height={4} 
        fill="#94A3B8" 
        rx={1}
      />

      {/* Decorative details */}
      <rect x={2} y={10} width={4} height={4} fill="#475569" rx={1} />
      <rect x={2} y={66} width={4} height={4} fill="#475569" rx={1} />
    </g>
  );
};
