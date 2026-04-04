import React from 'react';
import { MACHINE_LAYOUT_2D } from '../../machineLayout';

interface GroupingLanesProps {
  stopperRef: React.RefObject<SVGGElement | null>;
  terminalRef: React.RefObject<SVGGElement | null>;
}

export const GroupingLanes: React.FC<GroupingLanesProps> = ({ stopperRef, terminalRef }) => {
  const { grouping } = MACHINE_LAYOUT_2D;

  return (
    <g className="grouping-lanes">
      <g transform={`translate(${grouping.clampX}, ${grouping.y})`}>
        <g ref={stopperRef}>
          <rect x={0} y={0} width={5} height={grouping.height} fill="url(#mechanical-metallic)" rx={1} stroke="#0F172A" strokeWidth={1} />
          <rect x={-2} y={0} width={8} height={10} fill="#334155" rx={1} />
          <rect x={-2} y={grouping.height - 10} width={8} height={10} fill="#334155" rx={1} />
        </g>
        <rect x={1} y={0} width={2} height={grouping.height} fill="#1E293B" fillOpacity={0.2} />
      </g>

      <g transform={`translate(${grouping.chainStopX}, ${grouping.y})`}>
        <g ref={terminalRef}>
          <rect x={0} y={0} width={5} height={grouping.height} fill="url(#mechanical-metallic)" rx={1} stroke="#0F172A" strokeWidth={1} />
          <rect x={-2} y={0} width={8} height={10} fill="#334155" rx={1} />
          <rect x={-2} y={grouping.height - 10} width={8} height={10} fill="#334155" rx={1} />
        </g>
      </g>
    </g>
  );
};
