import React from 'react';

interface FlowArrowProps {
  x: number;
  y: number;
  active?: boolean;
}

export const FlowArrow: React.FC<FlowArrowProps> = ({ x, y, active = true }) => {
  return (
    <g className={active ? 'flow-arrow-active' : 'flow-arrow-idle'} transform={`translate(${x}, ${y})`}>
      <path
        d="M 0 0 L 10 5 L 0 10"
        stroke="var(--color-machine-frame)"
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.4}
      />
    </g>
  );
};
