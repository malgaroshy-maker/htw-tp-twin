import * as THREE from 'three';

/**
 * Shared unit geometries.
 *
 * The scene declared ~97 separate `<boxGeometry args={[w,h,d]}/>` elements, one
 * per mesh — the renderer reported 235 live geometries. Boxes are all the same
 * shape, so a single unit cube scaled per mesh replaces every one of them.
 *
 * Non-uniform scale is safe here: three.js derives the normal matrix from the
 * world matrix, so lighting stays correct on stretched boxes.
 */

let cache: {
  box: THREE.BoxGeometry;
  cylinder: THREE.CylinderGeometry;
  plane: THREE.PlaneGeometry;
  cone: THREE.ConeGeometry;
  sphere: THREE.SphereGeometry;
} | null = null;

function build() {
  return {
    box: new THREE.BoxGeometry(1, 1, 1),
    // radius 0.5 so `scale=[d, h, d]` gives a cylinder of diameter d, height h
    cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
    plane: new THREE.PlaneGeometry(1, 1),
    cone: new THREE.ConeGeometry(0.5, 1, 16),
    sphere: new THREE.SphereGeometry(0.5, 16, 12),
  };
}

export function geometries() {
  if (!cache) cache = build();
  return cache;
}

export function disposeGeometries() {
  if (!cache) return;
  for (const g of Object.values(cache)) g.dispose();
  cache = null;
}
