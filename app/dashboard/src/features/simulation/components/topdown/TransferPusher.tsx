import React from 'react';
import { MACHINE_LAYOUT_2D } from '../../machineLayout';

interface TransferPusherProps {
  pusherRef: React.RefObject<SVGGElement | null>;
}

export const TransferPusher: React.FC<TransferPusherProps> = ({ pusherRef }) => {
  const { transfer, grouping } = MACHINE_LAYOUT_2D;

  return (
    <g className="transfer-pusher" transform={`translate(${transfer.x}, ${grouping.y})`}>
      <rect x={-12} y={8} width={96} height={grouping.height - 16} fill="#0B1324" stroke="#475569" strokeWidth={1.2} rx={8} opacity={0.9} />
      <rect x={-5} y={16} width={84} height={grouping.height - 32} fill="#101826" stroke="#334155" strokeWidth={1} rx={6} opacity={0.95} />
      <rect x={-6} y={10} width={4} height={grouping.height - 20} fill="#CBD5E1" rx={1} />
      <rect x={70} y={10} width={4} height={grouping.height - 20} fill="#CBD5E1" rx={1} />
      {[-26, 0, 26].map((xOffset) => (
        <line key={`chain-guide-${xOffset}`} x1={xOffset} y1={20} x2={xOffset} y2={grouping.height - 20} stroke="#94A3B8" strokeWidth={3} opacity={0.75} />
      ))}
      {[-38, -12, 14, 40].map((xOffset) => (
        <line key={`bed-guide-${xOffset}`} x1={xOffset} y1={14} x2={xOffset} y2={grouping.height - 14} stroke="#334155" strokeWidth={1.8} opacity={0.5} />
      ))}
      <g ref={pusherRef}>
        {[-28, 0, 28].map((xOffset) => (
          <g key={xOffset} transform={`translate(${xOffset}, 0)`}>
            <rect x={-4} y={18} width={8} height={grouping.height - 36} fill="#475569" rx={2} />
            <rect x={-12} y={40} width={24} height={10} fill="#22C55E" rx={2} stroke="#14532D" strokeWidth={1} />
            <rect x={-12} y={grouping.height - 50} width={24} height={10} fill="#22C55E" rx={2} stroke="#14532D" strokeWidth={1} />
            <rect x={-7} y={36} width={14} height={4} fill="#CBD5E1" rx={1} opacity={0.9} />
            <rect x={-7} y={grouping.height - 54} width={14} height={4} fill="#CBD5E1" rx={1} opacity={0.9} />
          </g>
        ))}
      </g>

      <g transform="translate(76, 16)">
        <rect x={0} y={0} width={10} height={10} rx={2} fill="#1E293B" stroke="#64748B" strokeWidth={1} />
        <circle cx={5} cy={5} r={2.2} fill="#38BDF8" opacity={0.9} />
      </g>
      <g transform="translate(80, -18)">
        <rect x={0} y={0} width={16} height={16} rx={2} fill="#CBD5E1" stroke="#475569" strokeWidth={1} />
        <circle cx={12} cy={8} r={2.2} fill="#0EA5E9" />
        <line x1={0} y1={8} x2={10} y2={8} stroke="#334155" strokeWidth={1.5} />
      </g>
    </g>
  );
};
