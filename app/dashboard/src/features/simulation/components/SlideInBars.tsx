import React from 'react';

interface SlideInBarsProps {
  progress: number; // 0.0 to 1.0 (TRANSFER phase)
  active: boolean;  // Whether currently in TRANSFER phase
}

export const SlideInBars: React.FC<SlideInBarsProps> = ({ progress, active }) => {
  // TRANSFER phase timing:
  // 0.0 - 0.2: Descend (Vertical)
  // 0.2 - 0.8: Stroke (Horizontal)
  // 0.8 - 1.0: Ascend (Vertical)
  
  let ty = -40; // Default up position
  let tx = 0;   // Default start position
  let opacity = 0;

  if (active) {
    opacity = 1;
    if (progress < 0.2) {
      const p = progress / 0.2;
      ty = -40 + (p * 40); // Move down
    } else if (progress < 0.8) {
      const p = (progress - 0.2) / 0.6;
      ty = 0;
      tx = p * 60; // Short transfer stroke (60px)
    } else {
      const p = (progress - 0.8) / 0.2;
      tx = 60;
      ty = 0 - (p * 40); // Move up
    }
  }

  return (
    <g className="slide-in-mechanism" transform={`translate(${tx}, ${ty})`} style={{ opacity, transition: 'opacity 0.2s' }}>
      {/* Overhead Slide Rail */}
      <rect x={-80} y={-5} width={80} height={10} fill="#334155" rx={1} />
      
      {/* Heavy Vertical Bars */}
      <rect x={-2} y={0} width={4} height={80} fill="url(#mechanical-metallic)" rx={2} stroke="#0F172A" strokeWidth={1} />
      <rect x={-22} y={0} width={4} height={80} fill="url(#mechanical-metallic)" rx={2} stroke="#0F172A" strokeWidth={1} />
      
      {/* Top connect bracket */}
      <rect x={-25} y={-5} width={30} height={10} fill="#1E293B" rx={2} />
      
      {/* Decorative mechanical details */}
      <circle cx={-20} cy={5} r={1.5} fill="#94A3B8" />
      <circle cx={0} cy={5} r={1.5} fill="#94A3B8" />
    </g>
  );
};
