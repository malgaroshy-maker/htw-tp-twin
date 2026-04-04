import React from 'react';

interface StopGateProps {
  isOpen: boolean;
}

export const StopGate: React.FC<StopGateProps> = ({ isOpen }) => {
  return (
    <g className="stop-gate">
      {/* Housing */}
      <rect x={-2} y={-10} width={8} height={12} fill="#334155" rx={1} />
      
      {/* Mechanical Pin */}
      <rect 
        x={0} y={0} 
        width={4} height={40} 
        fill="url(#mechanical-metallic)" 
        className="transition-transform duration-500 ease-in-out"
        style={{ 
          transform: `translateY(${isOpen ? -35 : 0}px)`,
        }}
      />
      
      {/* Status LED */}
      <circle 
        cx={2} cy={-4} r={1.5} 
        fill={isOpen ? "#10B981" : "#EF4444"} 
        className={isOpen ? "" : "animate-pulse"}
      />
      
      <defs>
        <linearGradient id="mechanical-metallic" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="50%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
    </g>
  );
};
