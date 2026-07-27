import { forwardRef } from 'react';
import type { Mesh } from 'three';
import { geometries } from './geometries';
import { materials } from './materials';
import type { MaterialKey } from './materials';

type Vec3 = [number, number, number];

interface PrimitiveProps {
  /** Registry key — never an inline material. */
  mat: MaterialKey;
  /** World-space size in scene units; maps onto the shared unit geometry's scale. */
  size: Vec3;
  pos?: Vec3;
  rot?: Vec3;
  castShadow?: boolean;
  receiveShadow?: boolean;
  visible?: boolean;
  renderOrder?: number;
}

/**
 * A box drawn from the shared unit cube and a registry material.
 *
 * Replaces the `<mesh><boxGeometry args={[w,h,d]}/><meshStandardMaterial .../></mesh>`
 * triple that appeared ~97 times. `size` reads the same as the old `args`, so
 * conversions stay mechanical and reviewable.
 */
export const Box = forwardRef<Mesh, PrimitiveProps>(function Box(
  { mat, size, pos, rot, castShadow, receiveShadow, visible, renderOrder },
  ref
) {
  return (
    <mesh
      ref={ref}
      geometry={geometries().box}
      material={materials()[mat]}
      position={pos}
      rotation={rot}
      scale={size}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      visible={visible}
      renderOrder={renderOrder}
    />
  );
});

/** Cylinder from the shared unit cylinder. `size` is [diameter, height, diameter]. */
export const Cyl = forwardRef<Mesh, PrimitiveProps>(function Cyl(
  { mat, size, pos, rot, castShadow, receiveShadow, visible },
  ref
) {
  return (
    <mesh
      ref={ref}
      geometry={geometries().cylinder}
      material={materials()[mat]}
      position={pos}
      rotation={rot}
      scale={size}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      visible={visible}
    />
  );
});

/** Flat plane from the shared unit plane. `size` is [width, height, 1]. */
export const Plane = forwardRef<Mesh, PrimitiveProps>(function Plane(
  { mat, size, pos, rot, receiveShadow, visible },
  ref
) {
  return (
    <mesh
      ref={ref}
      geometry={geometries().plane}
      material={materials()[mat]}
      position={pos}
      rotation={rot}
      scale={size}
      receiveShadow={receiveShadow}
      visible={visible}
    />
  );
});
