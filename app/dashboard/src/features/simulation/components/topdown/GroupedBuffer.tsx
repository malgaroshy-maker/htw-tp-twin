import React from 'react';
import { MACHINE_LAYOUT_2D, getLaneCenters2D } from '../../machineLayout';

interface GroupedBufferProps {
  groupedCount: number;
  rows: number;
  cols: number;
}

export const GroupedBuffer: React.FC<GroupedBufferProps> = ({ groupedCount, rows, cols }) => {
  const totalSlots = rows * cols;
  const visibleCount = Math.max(0, Math.min(groupedCount, totalSlots));
  const slotSpacingX = 16;
  const laneCenters = getLaneCenters2D(rows);
  const originX = MACHINE_LAYOUT_2D.grouping.clampX - 12;

  return (
    <g className="grouped-buffer-layer" opacity={0.95}>
      {Array.from({ length: visibleCount }).map((_, index) => {
        const lane = Math.floor(index / cols);
        const slotInLane = index % cols;
        const x = originX - slotInLane * slotSpacingX;
        const y = laneCenters[Math.min(lane, laneCenters.length - 1)];

        return (
          <g key={index} transform={`translate(${x}, ${y})`}>
            <circle
              r="6.5"
              fill="#10B981"
              stroke="white"
              strokeWidth="1.2"
              style={{ filter: 'drop-shadow(0 0 2px rgba(16,185,129,0.35))' }}
            />
          </g>
        );
      })}
    </g>
  );
};
