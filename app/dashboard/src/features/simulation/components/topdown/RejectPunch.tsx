import React from 'react';
import { MACHINE_LAYOUT_2D } from '../../machineLayout';

interface RejectPunchProps {
  punchRef: React.RefObject<SVGGElement | null>;
  rejectCount: number;
}

export const RejectPunch: React.FC<RejectPunchProps> = ({ punchRef, rejectCount }) => {
  const { reject } = MACHINE_LAYOUT_2D;
  const storedCount = Math.min(3, rejectCount);

  return (
    <g className="reject-conveyor-2d">
      <path
        d={`M ${reject.x - 34} ${reject.y - 36} Q ${reject.x - 10} ${reject.y - 12} ${reject.x + 8} ${reject.y + 4}`}
        fill="none"
        stroke="#334155"
        strokeWidth={8}
        strokeLinecap="round"
        opacity={0.85}
      />

      <g ref={punchRef} transform={`translate(${reject.x - 18}, ${reject.y - 26})`}>
        <rect x={-8} y={-18} width={16} height={42} fill="#475569" rx={2} />
        <rect x={-18} y={20} width={36} height={8} fill="#94A3B8" rx={2} />
      </g>

      <rect x={reject.x} y={reject.y} width={reject.width} height={reject.height} fill="#111827" stroke="#475569" strokeWidth={1.2} rx={8} />
      <rect x={reject.x + 6} y={reject.y + 7} width={reject.width - 12} height={reject.height - 14} fill="#0B1324" rx={6} />
      <line x1={reject.x + 12} y1={reject.y + 5} x2={reject.x + 12} y2={reject.y + reject.height - 5} stroke="#1F2937" strokeWidth={2} />
      <line x1={reject.x + reject.width - 12} y1={reject.y + 5} x2={reject.x + reject.width - 12} y2={reject.y + reject.height - 5} stroke="#1F2937" strokeWidth={2} />
      {Array.from({ length: 5 }).map((_, index) => (
        <line
          key={index}
          x1={reject.x + 12 + index * 18}
          y1={reject.y + 7}
          x2={reject.x + 12 + index * 18}
          y2={reject.y + reject.height - 7}
          stroke="#334155"
          strokeWidth={1.6}
          opacity={0.7}
        />
      ))}

      {Array.from({ length: storedCount }).map((_, index) => {
        const x = reject.x + 22 + index * 28;
        return (
          <g key={index} transform={`translate(${x}, ${reject.y + reject.height / 2})`}>
            <rect x={-11} y={-8} width={22} height={16} rx={2} fill="#92400E" stroke="#451A03" strokeWidth={1} />
            <rect x={-9} y={-6} width={18} height={12} rx={1.5} fill="#B45309" opacity={0.92} />
          </g>
        );
      })}

      <text
        x={reject.x + reject.width / 2}
        y={reject.y + reject.height + 18}
        fill={rejectCount > 0 ? '#FCA5A5' : '#64748B'}
        fontSize={9}
        fontWeight="black"
        letterSpacing={1.6}
        textAnchor="middle"
      >
        REJECT CONVEYOR
      </text>
    </g>
  );
};
