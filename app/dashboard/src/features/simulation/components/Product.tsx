import React from 'react';

interface ProductProps {
  style?: React.CSSProperties;
}

export const Product: React.FC<ProductProps> = ({ style }) => {
  return (
    <g className="product-carton" style={style}>
      {/* Body */}
      <rect
        x={2}
        y={2}
        width={14}
        height={11}
        rx={1}
        fill="url(#product-metallic)"
        stroke="#1E293B"
        strokeWidth={1}
      />
      
      {/* Neck/Top detail */}
      <rect
        x={4}
        y={0}
        width={10}
        height={2}
        rx={0.5}
        fill="#64748B"
      />
      
      {/* Subtle branding/label line */}
      <rect
        x={2}
        y={6}
        width={14}
        height={3}
        fill="#3B82F6"
        fillOpacity={0.4}
        stroke="none"
      />
    </g>
  );
};

