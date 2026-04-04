import React from 'react';

interface SuctionArmProps {
  progress: number; // 0.0 to 1.0 (blank feed phase)
  active: boolean;
  vacuumOk: boolean;
}

export const SuctionArm: React.FC<SuctionArmProps> = ({ progress, active, vacuumOk }) => {
  // BLANK_FEED sub-sequence:
  // magazine_check (0.0 - 0.05)
  // suction (0.05 - 0.45)
  // position (0.45 - 0.9)
  // ready (0.9 - 1.0)
  
  // Angles:
  // -135: Pointing Up-Right (towards magazine)
  // -45: Pointing Down-Right (towards forming zone)
  let angle = -135; 
  let suctionActive = false;

  if (active) {
    if (progress < 0.05) {
      // magazine_check
      angle = -135;
    } else if (progress < 0.45) {
      // suction
      angle = -135;
      suctionActive = vacuumOk;
    } else if (progress < 0.9) {
      // position
      const p = (progress - 0.45) / 0.45;
      angle = -135 + (p * 90); // Swing down to forming area (-45)
      suctionActive = vacuumOk;
    } else {
      // ready
      angle = -45;
      suctionActive = false;
    }
  }

  return (
    <g className="suction-arm-mechanism" transform={`rotate(${angle})`} style={{ transition: 'transform 0.1s linear' }}>
      {/* Heavy structural arm */}
      <rect x={-4} y={0} width={8} height={100} fill="#475569" rx={2} />
      
      {/* Suction cups */}
      <g transform="translate(0, 100)">
        <path d="M -10 0 Q 0 10 10 0" fill="none" stroke="#94A3B8" strokeWidth={2} />
        <circle cx={-8} cy={2} r={3} fill={suctionActive ? "#10B981" : "#64748B"} />
        <circle cx={8} cy={2} r={3} fill={suctionActive ? "#10B981" : "#64748B"} />
        
        {/* Held Blank (Visual only if active) */}
        {suctionActive && (
          <rect x={-50} y={5} width={100} height={4} fill="#92400E" rx={1} />
        )}
      </g>
      
      {/* Axis pivot */}
      <circle cx={0} cy={0} r={6} fill="#1E293B" stroke="#475569" strokeWidth={2} />
      <circle cx={0} cy={0} r={2} fill="#94A3B8" />
    </g>
  );
};
