import React from 'react';

interface DiverterProps {
  x: number;
  y: number;
  active: boolean; // if true, it's diverting
}

export const Diverter: React.FC<DiverterProps> = ({ x, y, active }) => {
  return (
    <g 
      className="diverter" 
      transform={`translate(${x}, ${y})`}
    >
      {/* Heavy Mechanical Pivot */}
      <circle cx={0} cy={0} r={6} fill="var(--color-machine-frame)" stroke="#1E293B" strokeWidth={1} />
      <circle cx={0} cy={0} r={2} fill="#94A3B8" />
      
      {/* Structural Arm */}
      <g 
        className="transition-transform duration-500 ease-in-out"
        style={{ 
          transform: `rotate(${active ? -45 : 0}deg)`,
          transformOrigin: '0 0'
        }}
      >
        <rect
          x={-3}
          y={0}
          width={6}
          height={45}
          fill="var(--color-machine-frame)"
          stroke="#1E293B"
          strokeWidth={1}
          rx={3}
        />
        {/* Rubber/Friction Pad on arm */}
        <rect
          x={-2}
          y={10}
          width={4}
          height={25}
          fill="#334155"
          rx={1}
        />
      </g>
    </g>
  );
};

