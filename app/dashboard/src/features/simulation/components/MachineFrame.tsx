import React from 'react';

interface MachineFrameProps {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  variant?: 'primary' | 'secondary';
  labelSize?: 'small' | 'large';
  labelY?: number;
  isFaulted?: boolean;
}

export const MachineFrame: React.FC<MachineFrameProps> = ({ 
  x, y, width, height, label, 
  variant = 'primary', 
  labelSize = 'small',
  labelY, 
  isFaulted 
}) => {
  const isPrimary = variant === 'primary';
  const isLarge = labelSize === 'large';
  const finalLabelY = labelY ?? (isLarge ? y - 12 : y - 8);
  
  return (
    <g className={`machine-frame ${isFaulted ? 'zone-fault-pulse' : ''}`}>
      {/* Outer structural frame */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        fill={isFaulted ? 'url(#fault-gradient)' : 'var(--color-machine-frame)'}
        fillOpacity={isFaulted ? 0.15 : (isPrimary ? 0.08 : 0.03)}
        stroke={isFaulted ? '#EF4444' : 'var(--color-machine-frame)'}
        strokeWidth={isFaulted ? 3 : (isPrimary ? 2 : 1.5)}
        strokeOpacity={isFaulted ? 0.8 : (isPrimary ? 0.6 : 0.3)}
        className="transition-all duration-500"
      />
      
      {/* Label */}
      {label && (
        <text
          x={x + 2}
          y={finalLabelY}
          className={`font-hmi uppercase tracking-widest transition-all duration-300 ${
            isFaulted 
              ? 'fill-red-500 font-black' 
              : isPrimary 
                ? 'fill-slate-100 font-black' 
                : 'fill-slate-400 font-bold opacity-60'
          }`}
          style={{ 
            fontSize: isLarge ? '15px' : '11px',
            filter: isLarge ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' : 'none'
          }}
        >
          {label}
        </text>
      )}
    </g>
  );
};

