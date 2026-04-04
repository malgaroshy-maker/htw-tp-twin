import React from 'react';

interface BlankMagazineProps {
  x: number;
  y: number;
  width: number;
  height: number;
  count: number; // 0 to 100
}

export const BlankMagazine: React.FC<BlankMagazineProps> = ({ x, y, width, height, count }) => {
  // Max capacity 100
  const normalizedCount = Math.min(100, Math.max(0, count));
  
  return (
    <g className="blank-magazine">
      {/* Magazine side walls */}
      <rect x={x - 2} y={y} width={2} height={height} fill="var(--color-machine-frame)" />
      <rect x={x + width} y={y} width={2} height={height} fill="var(--color-machine-frame)" />
      
      {/* Blank stack */}
      {normalizedCount === 0 ? (
        <rect
          x={x}
          y={y + height - 10}
          width={width}
          height={10}
          fill="rgba(239, 68, 68, 0.2)"
          stroke="#ef4444"
          strokeWidth={1}
          opacity={0.8}
        />
      ) : (
        <>
          <rect
            x={x}
            y={y + height - (height * (normalizedCount / 100))}
            width={width}
            height={height * (normalizedCount / 100)}
            fill="var(--color-cardboard)"
            opacity={0.8}
            stroke="var(--color-machine-frame)"
            strokeWidth={1}
          />
          
          {/* Individual blank lines (visual) */}
          <g opacity={0.4}>
            {Array.from({ length: Math.ceil(normalizedCount / 5) }).map((_, i) => {
              const lineY = y + height - (i * (height / 20));
              return (
                <line
                  key={i}
                  x1={x}
                  y1={lineY}
                  x2={x + width}
                  y2={lineY}
                  stroke="rgba(0,0,0,0.5)"
                  strokeWidth={0.5}
                />
              );
            })}
          </g>
        </>
      )}
      
      {/* Warning Label */}
      {normalizedCount < 20 && normalizedCount > 0 && (
        <text
          x={x + width + 8}
          y={y + height / 2}
          fill="#f59e0b"
          fontSize={10}
          fontWeight="bold"
          fontFamily='"Inter", sans-serif'
        >
          LOW
        </text>
      )}

      {normalizedCount === 0 && (
        <text
          x={x + width + 8}
          y={y + height / 2}
          fill="#ef4444"
          fontSize={10}
          fontWeight="bold"
          fontFamily='"Inter", sans-serif'
        >
          MTY
        </text>
      )}
      
      {/* Counter label (Top-placed to avoid overlap with machine line) */}
      <text
        x={x + width / 2}
        y={y - 12}
        fill={normalizedCount === 0 ? "#ef4444" : "var(--color-cardboard)"}
        textAnchor="middle"
        className="font-mono text-[11px] font-black tracking-tighter drop-shadow-sm"
        style={{ fontFamily: '"JetBrains Mono", monospace' }}
      >
        {normalizedCount}
      </text>

      {/* Mechanical Feeder Base */}
      <rect 
        x={x - 10} 
        y={y + height} 
        width={width + 20} 
        height={6} 
        rx={2}
        fill="var(--color-machine-frame)" 
      />
      <rect 
        x={x + width/2 - 15} 
        y={y + height + 6} 
        width={30} 
        height={4} 
        fill="var(--color-machine-frame)" 
        opacity={0.6}
      />
    </g>
  );
};
