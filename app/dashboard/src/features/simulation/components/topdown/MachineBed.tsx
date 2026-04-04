import React from 'react';
import { MACHINE_LAYOUT_2D, getLaneCenters2D } from '../../machineLayout';

export const MachineBed: React.FC = () => {
  const laneCenters = getLaneCenters2D(3);
  const { chassis, infeed, grouping, transfer, mainTransport, glue, discharge, blankMagazine, crossTransfer, blankWithdraw, blankTransport, glueGuideSpan, reject } = MACHINE_LAYOUT_2D;

  return (
    <g className="machine-bed">
      <g opacity={0.1}>
        {Array.from({ length: 100 }).map((_, i) => (
          <line key={`v-${i}`} x1={i * 10} y1={0} x2={i * 10} y2={600} stroke="#475569" strokeWidth={0.5} />
        ))}
        {Array.from({ length: 60 }).map((_, i) => (
          <line key={`h-${i}`} x1={0} y1={i * 10} x2={1000} y2={i * 10} stroke="#475569" strokeWidth={0.5} />
        ))}
      </g>

      <rect x={chassis.x} y={chassis.y} width={chassis.width} height={chassis.height} fill="#334155" stroke="#475569" strokeWidth={2} rx={12} />
      <rect x={chassis.x + 5} y={chassis.y + 5} width={chassis.width - 10} height={chassis.height - 10} fill="#0F172A" rx={10} />
      <rect x={chassis.x + 5} y={chassis.y + 5} width={chassis.width - 10} height={92} fill="white" opacity={0.03} rx={10} />

      <rect x={infeed.x} y={infeed.y} width={infeed.width} height={infeed.height} fill="#111827" stroke="#1E293B" strokeWidth={1} rx={6} />
      {Array.from({ length: 6 }).map((_, i) => (
        <line key={`in-r-${i}`} x1={infeed.x + 8 + i * 18} y1={infeed.y + 4} x2={infeed.x + 8 + i * 18} y2={infeed.y + infeed.height - 4} stroke="#1F2937" strokeWidth={2} />
      ))}

      <rect x={grouping.x} y={grouping.y} width={grouping.width} height={grouping.height} fill="#101826" stroke="#1E293B" strokeWidth={1} rx={8} />
      <rect x={grouping.x + 4} y={grouping.y + 6} width={grouping.width - 8} height={grouping.height - 12} fill="#0B1324" rx={6} />
      {laneCenters.map((centerY) => (
        <rect key={centerY} x={grouping.x + 8} y={centerY - 12} width={grouping.width - 16} height={24} fill="#0F172A" stroke="#334155" strokeWidth={1} rx={4} opacity={0.95} />
      ))}
      {laneCenters.slice(0, -1).map((centerY, index) => (
        <line key={`lane-divider-${index}`} x1={grouping.x + 8} y1={(centerY + laneCenters[index + 1]) / 2} x2={grouping.x + grouping.width - 8} y2={(centerY + laneCenters[index + 1]) / 2} stroke="#334155" strokeWidth={1.5} strokeDasharray="8 5" opacity={0.7} />
      ))}

      <rect x={transfer.x} y={transfer.y} width={transfer.width} height={transfer.height} fill="#111827" stroke="#334155" strokeWidth={1} rx={8} />
      <rect x={mainTransport.x} y={mainTransport.y} width={mainTransport.width} height={mainTransport.height} fill="#101826" stroke="#334155" strokeWidth={1} rx={10} />
      <rect x={glue.x} y={glue.y} width={glue.width} height={glue.height} fill="#0B1324" stroke="#334155" strokeWidth={1} rx={8} opacity={0.92} />
      <rect x={discharge.x} y={discharge.y} width={discharge.width} height={discharge.height} fill="#111827" stroke="#334155" strokeWidth={1} rx={8} />
      <path d={`M ${discharge.x - 6} ${discharge.y + discharge.height - 8} Q ${reject.x - 10} ${reject.y - 12} ${reject.x + 4} ${reject.y + 10}`} fill="none" stroke="#334155" strokeWidth={6} strokeLinecap="round" opacity={0.75} />
      <rect x={reject.x} y={reject.y} width={reject.width} height={reject.height} fill="#101826" stroke="#334155" strokeWidth={1} rx={8} />
      <rect x={reject.x + 4} y={reject.y + 5} width={reject.width - 8} height={reject.height - 10} fill="#0B1324" rx={6} />

      <rect x={blankMagazine.x} y={blankMagazine.y} width={blankMagazine.width} height={blankMagazine.height} fill="#182436" stroke="#475569" strokeWidth={1.2} rx={8} />
      <rect x={crossTransfer.x} y={crossTransfer.y} width={crossTransfer.width} height={crossTransfer.height} fill="#132033" stroke="#475569" strokeWidth={1} rx={6} />
      <rect x={blankWithdraw.x} y={blankWithdraw.y} width={blankWithdraw.width} height={blankWithdraw.height} fill="#101826" stroke="#475569" strokeWidth={1} rx={8} />
      <rect x={blankTransport.x} y={blankTransport.y} width={blankTransport.width} height={blankTransport.height} fill="#182436" stroke="#475569" strokeWidth={1} rx={6} />

      {Array.from({ length: 8 }).map((_, i) => (
        <line key={`mag-roll-${i}`} x1={blankMagazine.x + 18 + i * 20} y1={blankMagazine.y + 12} x2={blankMagazine.x + 18 + i * 20} y2={blankMagazine.y + blankMagazine.height - 12} stroke="#64748B" strokeWidth={2} opacity={0.55} />
      ))}
      {Array.from({ length: 4 }).map((_, i) => (
        <line key={`blank-driver-${i}`} x1={blankTransport.x + 24 + i * 90} y1={blankTransport.y} x2={blankTransport.x + 24 + i * 90} y2={blankTransport.y + blankTransport.height} stroke="#334155" strokeWidth={4} opacity={0.85} />
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <line key={`reject-driver-${i}`} x1={reject.x + 12 + i * 18} y1={reject.y + 5} x2={reject.x + 12 + i * 18} y2={reject.y + reject.height - 5} stroke="#334155" strokeWidth={2} opacity={0.7} />
      ))}

      <line x1={glueGuideSpan.x1} y1={glueGuideSpan.topY} x2={glueGuideSpan.x2} y2={glueGuideSpan.topY} stroke="#94A3B8" strokeWidth={3} opacity={0.65} />
      <line x1={glueGuideSpan.x1} y1={glueGuideSpan.bottomY} x2={glueGuideSpan.x2} y2={glueGuideSpan.bottomY} stroke="#94A3B8" strokeWidth={3} opacity={0.65} />
      <line x1={mainTransport.x + 10} y1={mainTransport.y + 26} x2={glueGuideSpan.x2} y2={mainTransport.y + 26} stroke="#334155" strokeWidth={1.3} strokeDasharray="7 5" opacity={0.45} />
      <line x1={mainTransport.x + 10} y1={mainTransport.y + 60} x2={glueGuideSpan.x2} y2={mainTransport.y + 60} stroke="#334155" strokeWidth={1.3} strokeDasharray="7 5" opacity={0.45} />
      {Array.from({ length: 3 }).map((_, i) => (
        <line key={`fold-station-${i}`} x1={glue.x + 20 + i * 48} y1={glue.y + 8} x2={glue.x + 20 + i * 48} y2={glue.y + glue.height - 8} stroke="#334155" strokeWidth={1.1} strokeDasharray="5 5" opacity={0.35} />
      ))}

      <g fill="#64748B" fontSize={9} fontWeight="black" letterSpacing={1.8} style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <text x={infeed.x + infeed.width / 2} y={infeed.y - 10} textAnchor="middle">SINGLE INFEED</text>
        <text x={grouping.x + grouping.width / 2} y={grouping.y - 10} textAnchor="middle">SEPARATOR + DIVIDER + GROUPING</text>
        <text x={transfer.x + transfer.width / 2} y={transfer.y - 10} textAnchor="middle">CHAIN INFEED</text>
        <text x={blankMagazine.x + 64} y={blankMagazine.y - 10} textAnchor="middle">BLANK MAGAZINE</text>
        <text x={crossTransfer.x + crossTransfer.width / 2} y={crossTransfer.y - 10} textAnchor="middle">CROSS TRANSFER</text>
        <text x={blankWithdraw.x + blankWithdraw.width / 2} y={blankWithdraw.y - 10} textAnchor="middle">BLANK WITHDRAW</text>
        <text x={blankTransport.x + blankTransport.width / 2} y={blankTransport.y - 10} textAnchor="middle">BLANK TRANSPORT</text>
        <text x={mainTransport.x + mainTransport.width / 2} y={mainTransport.y - 10} textAnchor="middle">MAIN TRANSPORT</text>
        <text x={glue.x + glue.width / 2} y={glue.y - 10} textAnchor="middle">GLUE + FOLD + GUIDES</text>
        <text x={discharge.x + discharge.width / 2} y={discharge.y - 10} textAnchor="middle">OUTFEED</text>
        <text x={reject.x + reject.width / 2} y={reject.y + reject.height + 16} textAnchor="middle">REJECT CONVEYOR</text>
      </g>
    </g>
  );
};
