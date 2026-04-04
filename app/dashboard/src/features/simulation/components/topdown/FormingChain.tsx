import React from 'react';
import { MACHINE_LAYOUT_2D } from '../../machineLayout';

interface FormingChainProps {
  chainRef: React.RefObject<SVGGElement | null>;
  sidePusherTopRef: React.RefObject<SVGGElement | null>;
  sidePusherBottomRef: React.RefObject<SVGGElement | null>;
  active: boolean;
}

export const FormingChain: React.FC<FormingChainProps> = ({
  chainRef,
  sidePusherTopRef,
  sidePusherBottomRef,
  active,
}) => {
  const { transfer, mainTransport, glueGuideSpan } = MACHINE_LAYOUT_2D;

  return (
    <g className="forming-chain">
      <line x1={mainTransport.x} y1={mainTransport.centerY - 12} x2={950} y2={mainTransport.centerY - 12} stroke="#334155" strokeWidth={2} />
      <line x1={mainTransport.x} y1={mainTransport.centerY + 12} x2={950} y2={mainTransport.centerY + 12} stroke="#334155" strokeWidth={2} />
      <rect x={mainTransport.x} y={mainTransport.centerY - 6} width={414} height={12} fill="#1E293B" opacity={0.28} rx={4} />

      <g ref={sidePusherTopRef} transform={`translate(${transfer.x - 10}, ${glueGuideSpan.topY})`}>
        <rect x={-48} y={-8} width={96} height={10} fill="url(#mechanical-metallic)" rx={2} stroke="#0F172A" strokeWidth={1} />
        <rect x={-6} y={2} width={12} height={30} fill="#475569" rx={2} />
      </g>
      <g ref={sidePusherBottomRef} transform={`translate(${transfer.x - 10}, ${glueGuideSpan.bottomY + 14})`}>
        <rect x={-48} y={-2} width={96} height={10} fill="url(#mechanical-metallic)" rx={2} stroke="#0F172A" strokeWidth={1} />
        <rect x={-6} y={-30} width={12} height={30} fill="#475569" rx={2} />
      </g>

      <rect x={glueGuideSpan.x1} y={glueGuideSpan.topY - 4} width={glueGuideSpan.x2 - glueGuideSpan.x1} height={8} fill="#64748B" rx={2} opacity={0.65} />
      <rect x={glueGuideSpan.x1} y={glueGuideSpan.bottomY - 4} width={glueGuideSpan.x2 - glueGuideSpan.x1} height={8} fill="#64748B" rx={2} opacity={0.65} />
      <rect x={glueGuideSpan.x1} y={glueGuideSpan.topY + 4} width={glueGuideSpan.x2 - glueGuideSpan.x1} height={4} fill="#CBD5E1" opacity={0.12} rx={2} />
      <rect x={glueGuideSpan.x1} y={glueGuideSpan.bottomY - 8} width={glueGuideSpan.x2 - glueGuideSpan.x1} height={4} fill="#CBD5E1" opacity={0.12} rx={2} />

      <g ref={chainRef}>
        {Array.from({ length: 14 }).map((_, i) => (
          <g key={i} transform={`translate(${i * 60}, 0)`}>
            <rect x={mainTransport.x} y={mainTransport.centerY - 20} width={6} height={40} fill="#475569" rx={1} />
            <rect x={mainTransport.x + 14} y={mainTransport.centerY - 12} width={20} height={6} fill="#475569" rx={1} opacity={0.9} />
            <rect x={mainTransport.x + 14} y={mainTransport.centerY + 6} width={20} height={6} fill="#475569" rx={1} opacity={0.9} />
          </g>
        ))}
      </g>

      <g transform="translate(674, 226)">
        <rect x={-5} y={-10} width={10} height={10} fill="#1E293B" stroke="#475569" />
        <circle cx={0} cy={0} r={2} fill={active ? "#F59E0B" : "#334155"} />
        <circle cx={0} cy={0} r={5} fill={active ? "rgba(245,158,11,0.18)" : "transparent"} />
      </g>
      <g transform="translate(674, 300)">
        <rect x={-5} y={-10} width={10} height={10} fill="#1E293B" stroke="#475569" />
        <circle cx={0} cy={0} r={2} fill={active ? "#F59E0B" : "#334155"} />
        <circle cx={0} cy={0} r={5} fill={active ? "rgba(245,158,11,0.18)" : "transparent"} />
      </g>
      <g transform="translate(742, 226)">
        <rect x={-5} y={0} width={10} height={10} fill="#1E293B" stroke="#475569" />
        <circle cx={0} cy={0} r={2} fill={active ? "#F59E0B" : "#334155"} />
        <circle cx={0} cy={0} r={5} fill={active ? "rgba(245,158,11,0.18)" : "transparent"} />
      </g>
      <g transform="translate(742, 300)">
        <rect x={-5} y={0} width={10} height={10} fill="#1E293B" stroke="#475569" />
        <circle cx={0} cy={0} r={2} fill={active ? "#F59E0B" : "#334155"} />
        <circle cx={0} cy={0} r={5} fill={active ? "rgba(245,158,11,0.18)" : "transparent"} />
      </g>
    </g>
  );
};
