import React from 'react';

interface GlueHeadProps {
  active: boolean;
}

export const GlueHead: React.FC<GlueHeadProps> = ({ active }) => {
  return (
    <g className="glue-head-mechanism">
      {/* Small Cylinder */}
      <rect x={-4} y={-10} width={8} height={15} fill="#475569" rx={1} />
      
      {/* Nozzle Tip */}
      <rect x={-1} y={5} width={2} height={4} fill="#94A3B8" />
      <circle cx={0} cy={9} r={1.5} fill="#1E293B" />
      
      {/* Spray Visual (Pulse if active) */}
      {active && (
        <circle cx={0} cy={12} r={2} fill="#FDE047" className="animate-ping" style={{ opacity: 0.6 }} />
      )}
    </g>
  );
};
