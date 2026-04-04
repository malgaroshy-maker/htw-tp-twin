import React from 'react';

interface SensorLEDProps {
  x: number;
  y: number;
  active: boolean;
  label: string;
  labelPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export const SensorLED: React.FC<SensorLEDProps> = ({ x, y, active, label, labelPosition = 'top' }) => {
  const color = active ? '#10B981' : '#EF4444'; // Emerald for OK, Red for Not OK
  
  let textX = x;
  let textY = y;
  let textAnchor: 'start' | 'middle' | 'end' = 'middle';
  
  switch (labelPosition) {
    case 'top':
      textY = y - 8;
      break;
    case 'bottom':
      textY = y + 12;
      break;
    case 'left':
      textX = x - 8;
      textY = y + 3;
      textAnchor = 'end';
      break;
    case 'right':
      textX = x + 8;
      textY = y + 3;
      textAnchor = 'start';
      break;
  }

  return (
    <g className="sensor-led" style={{ transition: 'all 0.2s ease' }}>
      {/* Glow effect */}
      <circle cx={x} cy={y} r={6} fill={color} opacity={active ? 0.3 : 0.1} />
      {/* Core LED */}
      <circle cx={x} cy={y} r={3} fill={color} stroke="#0F172A" strokeWidth={1} />
      {/* Label */}
      <text 
        x={textX} 
        y={textY} 
        textAnchor={textAnchor} 
        fontSize={8} 
        fill="#94A3B8" 
        fontFamily='"JetBrains Mono", monospace'
        fontWeight="bold"
        letterSpacing={0.5}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {label}
      </text>
    </g>
  );
};
