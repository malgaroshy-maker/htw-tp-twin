import React from 'react';

interface StopperProps {
  isOpen: boolean;
}

export const Stopper: React.FC<StopperProps> = ({ isOpen }) => {
  return (
    <g className="stopper-mechanism">
      {/* Structural Support */}
      <rect x={-4} y={-5} width={12} height={10} fill="#334155" rx={1} />
      
      {/* Stopper Blade (Vertical movement) */}
      <rect 
        x={0} y={0} 
        width={4} height={40} 
        fill="url(#mechanical-metallic)" 
        className="transition-transform duration-300 ease-in-out"
        style={{ 
          transform: `translateY(${isOpen ? 35 : 0}px)`,
        }}
      />
      
      {/* Guide Rail */}
      <rect x={1} y={0} width={2} height={40} fill="#1E293B" fillOpacity={0.4} />
    </g>
  );
};
