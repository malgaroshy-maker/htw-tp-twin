import React from 'react';

export interface ProductStreamProps {
  // Now purely ref-driven for high-performance animation
  productLayerRef: React.RefObject<SVGGElement | null>;
  formationRef: React.RefObject<SVGGElement | null>;
  packRef: React.RefObject<SVGGElement | null>;
}

export const ProductStream: React.FC<ProductStreamProps> = ({ 
  productLayerRef,
  formationRef,
  packRef
}) => {
  return (
    <g className="product-stream-layer">
      {/* Container for dynamically injected products */}
      <g ref={productLayerRef} id="product-container-td" />

      {/* Captured grouped slug before tray transfer */}
      <g ref={formationRef} id="captured-formation-td" opacity="0" />

      {/* The Active Pack Container */}
      <g ref={packRef} id="active-pack-td" opacity="0" />
    </g>
  );
};
