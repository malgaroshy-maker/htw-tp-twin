import React from 'react';

interface PackProps {
  rows?: number;
  cols?: number;
}

export const Pack: React.FC<PackProps> = ({ rows = 3, cols = 3 }) => {
  const pWidth = 12;
  const pHeight = 14;
  const padding = 4;
  
  const trayWidth = cols * pWidth + padding * 2;
  const trayHeight = rows * pHeight + padding * 2;

  return (
    <g className="tray-pack" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }}>
      {/* Outer tray body (Cardboard) */}
      <rect
        width={trayWidth}
        height={trayHeight}
        fill="#78350F"
        stroke="#451A03"
        strokeWidth={1.5}
        rx={2}
      />
      
      {/* Interior depth / Wall effect */}
      <rect x={2} y={2} width={trayWidth - 4} height={trayHeight - 4} fill="#92400E" rx={1} />
      
      {/* Product content representation */}
      <g transform={`translate(${padding}, ${padding})`}>
        {Array.from({ length: rows * cols }).map((_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          return (
            <g key={i} transform={`translate(${c * pWidth}, ${r * pHeight})`}>
              {/* Simplified product silhouette within the tray */}
              <rect
                width={pWidth - 2}
                height={pHeight - 2}
                rx={1}
                fill="url(#product-metallic)"
                stroke="#1E293B"
                strokeWidth={0.5}
              />
              <rect
                x={1}
                y={-1}
                width={pWidth - 4}
                height={1.5}
                rx={0.3}
                fill="#64748B"
              />
            </g>
          );
        })}
      </g>
      
      {/* Subtle tray flap/fold lines */}
      <line x1={0} y1={trayHeight/4} x2={2} y2={trayHeight/4} stroke="#451A03" strokeWidth={1} />
      <line x1={trayWidth-2} y1={trayHeight/4} x2={trayWidth} y2={trayHeight/4} stroke="#451A03" strokeWidth={1} />
      <line x1={0} y1={3*trayHeight/4} x2={2} y2={3*trayHeight/4} stroke="#451A03" strokeWidth={1} />
      <line x1={trayWidth-2} y1={3*trayHeight/4} x2={trayWidth} y2={3*trayHeight/4} stroke="#451A03" strokeWidth={1} />
    </g>
  );
};

