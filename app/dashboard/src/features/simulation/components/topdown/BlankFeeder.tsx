import React from 'react';
import { MACHINE_LAYOUT_2D } from '../../machineLayout';

interface BlankFeederProps {
  gantryRef: React.RefObject<SVGGElement | null>;
  blankRef: React.RefObject<SVGGElement | null>;
  stackCount: number;
}

export const BlankFeeder: React.FC<BlankFeederProps> = ({ gantryRef, blankRef, stackCount }) => {
  const { blankMagazine, crossTransfer, blankWithdraw, blankTransport } = MACHINE_LAYOUT_2D;

  return (
    <g className="blank-feeder">
      <g transform={`translate(${blankMagazine.x}, ${blankMagazine.y})`}>
        <rect x={0} y={0} width={blankMagazine.width} height={blankMagazine.height} fill="#1E293B" stroke="#475569" strokeWidth={1} rx={6} />
        {stackCount > 0 && (
          <rect
            x={14} y={14} width={blankMagazine.width - 28} height={blankMagazine.height - 28}
            fill="#78350F" opacity={0.54 + (stackCount / 250)}
            stroke="#451A03" strokeWidth={1}
            rx={4}
          />
        )}
        <line x1={blankMagazine.width - 18} y1={10} x2={blankMagazine.width - 18} y2={blankMagazine.height - 10} stroke="#94A3B8" strokeWidth={3} opacity={0.4} />
      </g>

      <g transform={`translate(${crossTransfer.x}, ${crossTransfer.y})`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <rect key={`cross-driver-${i}`} x={10 + i * 16} y={4} width={5} height={crossTransfer.height - 8} fill="#64748B" opacity={0.72} rx={2} />
        ))}
        <rect x={crossTransfer.width - 7} y={8} width={4} height={crossTransfer.height - 16} fill="#94A3B8" opacity={0.4} rx={2} />
      </g>

      <g transform={`translate(${blankWithdraw.x}, ${blankWithdraw.y})`}>
        <path d="M 18 18 L 52 38" stroke="#CBD5E1" strokeWidth={4} strokeLinecap="round" opacity={0.8} />
        <path d="M 18 76 L 52 56" stroke="#CBD5E1" strokeWidth={4} strokeLinecap="round" opacity={0.8} />
        <circle cx={54} cy={47} r={8} fill="#0EA5E9" opacity={0.35} />
      </g>

      <g>
        <line x1={blankTransport.x} y1={blankTransport.y} x2={blankTransport.x + blankTransport.width} y2={blankTransport.y} stroke="#475569" strokeWidth={2} />
        <line x1={blankTransport.x} y1={blankTransport.y + blankTransport.height} x2={blankTransport.x + blankTransport.width} y2={blankTransport.y + blankTransport.height} stroke="#475569" strokeWidth={2} />
        <line x1={crossTransfer.x + crossTransfer.width} y1={crossTransfer.y + crossTransfer.height / 2} x2={blankTransport.x} y2={blankTransport.y + blankTransport.height / 2} stroke="#64748B" strokeWidth={4} opacity={0.35} />
      </g>

      <g ref={gantryRef} transform={`translate(${blankTransport.x + 24}, ${blankTransport.y + blankTransport.height / 2})`}>
        <rect x={-30} y={9} width={60} height={8} fill="url(#mechanical-metallic)" rx={2} stroke="#0F172A" strokeWidth={1} />
        <rect x={-18} y={-8} width={36} height={5} fill="#334155" rx={2} />
        <g ref={blankRef} opacity={0}>
          <rect x={-50} y={-16} width={100} height={32} fill="#92400E" rx={2} stroke="#451A03" strokeWidth={1.5} />
          <line x1={-52} y1={0} x2={52} y2={0} stroke="#451A03" strokeWidth={0.5} opacity={0.5} />
          <line x1={-26} y1={-18} x2={-26} y2={18} stroke="#451A03" strokeWidth={0.5} opacity={0.35} />
          <line x1={26} y1={-18} x2={26} y2={18} stroke="#451A03" strokeWidth={0.5} opacity={0.35} />
        </g>
      </g>
    </g>
  );
};
