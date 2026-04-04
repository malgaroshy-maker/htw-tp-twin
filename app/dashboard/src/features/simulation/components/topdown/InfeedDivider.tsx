import React from 'react';
import { MACHINE_LAYOUT_2D } from '../../machineLayout';

interface InfeedDividerProps {
  dividerRef: React.RefObject<SVGGElement | null>;
  separatorRef: React.RefObject<SVGGElement | null>;
}

export const InfeedDivider: React.FC<InfeedDividerProps> = ({ dividerRef, separatorRef }) => {
  const { separator, grouping } = MACHINE_LAYOUT_2D;

  return (
    <g className="infeed-divider" transform={`translate(${separator.x}, ${separator.y})`}>
      <g transform="translate(-20, 0)">
        <line x1={0} y1={-34} x2={0} y2={34} stroke="#334155" strokeWidth={1.5} opacity={0.45} />
        <g ref={separatorRef}>
          <rect x={-3} y={-18} width={6} height={36} fill="#94A3B8" rx={1.5} stroke="#0F172A" strokeWidth={1} />
          <rect x={-6} y={-22} width={12} height={6} fill="#475569" rx={1} />
          <rect x={-6} y={16} width={12} height={6} fill="#475569" rx={1} />
        </g>
      </g>

      <circle cx={0} cy={0} r={7} fill="#334155" stroke="#94A3B8" strokeWidth={1.2} />
      <circle cx={0} cy={0} r={2.2} fill="#CBD5E1" opacity={0.9} />

      <g ref={dividerRef}>
        <rect x={0} y={-3} width={grouping.x - separator.x - 14} height={6} fill="url(#mechanical-metallic)" rx={2} stroke="#0F172A" strokeWidth={0.8} />
        <line x1={4} y1={-6} x2={grouping.x - separator.x - 14} y2={-6} stroke="#334155" strokeWidth={1} />
        <line x1={4} y1={6} x2={grouping.x - separator.x - 14} y2={6} stroke="#334155" strokeWidth={1} />
        <rect x={grouping.x - separator.x - 20} y={-6} width={12} height={12} fill="#CBD5E1" stroke="#475569" strokeWidth={1} rx={2} />
        {[-24, 0, 24].map((yOffset) => (
          <rect
            key={yOffset}
            x={grouping.x - separator.x - 6}
            y={yOffset - 2}
            width={18}
            height={4}
            rx={2}
            fill="#E2E8F0"
            stroke="#64748B"
            strokeWidth={0.8}
          />
        ))}
      </g>

      <path 
        d={`M ${grouping.x - separator.x - 8} -26 L ${grouping.x - separator.x + 12} -42 M ${grouping.x - separator.x - 8} 0 L ${grouping.x - separator.x + 14} 0 M ${grouping.x - separator.x - 8} 26 L ${grouping.x - separator.x + 12} 42`}
        stroke="#334155" 
        strokeWidth={1.2} 
        strokeDasharray="3 3" 
        opacity={0.45}
      />
    </g>
  );
};
