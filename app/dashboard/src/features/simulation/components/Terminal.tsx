import React from 'react';

interface TerminalProps {
  isClosed: boolean;
}

export const Terminal: React.FC<TerminalProps> = ({ isClosed }) => {
  return (
    <g className="terminal-mechanism">
      {/* Overhead Rail Support */}
      <rect x={-5} y={-40} width={14} height={4} fill="#475569" rx={1} />
      
      {/* Piston Rod */}
      <rect 
        x={0} y={-40} 
        width={4} height={40} 
        fill="#94A3B8" 
        className="transition-all duration-300 ease-in-out"
        style={{ 
          transform: `translateY(${isClosed ? 40 : 0}px)`,
        }}
      />
      
      {/* Terminal Blade (Separator) */}
      <rect 
        x={-2} y={0} 
        width={8} height={80} 
        fill="url(#mechanical-metallic)" 
        rx={1}
        className="transition-all duration-300 ease-in-out"
        style={{ 
          transform: `translateY(${isClosed ? 0 : -80}px)`,
          opacity: isClosed ? 1 : 0
        }}
      />
    </g>
  );
};
