import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { MaterialKey } from './materials';

/**
 * Static-geometry merging.
 *
 * Sharing one geometry across many meshes cuts memory but *not* draw calls —
 * each mesh is still its own call. Merging is what actually reduces them: the
 * parts are baked into a single buffer per material, so ~60 immovable meshes
 * become one draw call each per material.
 *
 * Only use this for geometry that never moves after mount.
 */

export type Vec3 = [number, number, number];

export interface StaticPart {
  mat: MaterialKey;
  /** Box/rounded: [w, h, d]. Cylinder: [diameter, height, diameter]. */
  size: Vec3;
  pos?: Vec3;
  rot?: Vec3;
  shape?: 'box' | 'cylinder';
  /** Corner radius; when set the part is built from a RoundedBoxGeometry. */
  radius?: number;
  /** Merged meshes share shadow flags, so parts are grouped by them too. */
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export interface MergedGroup {
  key: string;
  mat: MaterialKey;
  geometry: THREE.BufferGeometry;
  castShadow: boolean;
  receiveShadow: boolean;
}

function buildPartGeometry(part: StaticPart): THREE.BufferGeometry {
  const [w, h, d] = part.size;
  let geo: THREE.BufferGeometry;
  if (part.shape === 'cylinder') {
    geo = new THREE.CylinderGeometry(w / 2, w / 2, h, 16);
  } else if (part.radius !== undefined) {
    // smoothness 2 rather than drei's default 4: these are large flat slabs
    // where corner tessellation is invisible at any camera preset.
    geo = new RoundedBoxGeometry(w, h, d, 2, part.radius);
  } else {
    geo = new THREE.BoxGeometry(w, h, d);
  }

  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  if (part.rot) {
    quat.setFromEuler(new THREE.Euler(part.rot[0], part.rot[1], part.rot[2]));
  }
  matrix.compose(
    new THREE.Vector3(...(part.pos ?? [0, 0, 0])),
    quat,
    new THREE.Vector3(1, 1, 1)
  );
  geo.applyMatrix4(matrix);
  return geo;
}

/**
 * Bake a list of static parts into one merged geometry per
 * (material, castShadow, receiveShadow) combination.
 */
export function mergeStaticParts(parts: StaticPart[]): MergedGroup[] {
  const buckets = new Map<string, { part: StaticPart; geos: THREE.BufferGeometry[] }>();

  for (const part of parts) {
    const cast = part.castShadow ?? false;
    const receive = part.receiveShadow ?? false;
    const key = `${part.mat}|${cast ? 1 : 0}|${receive ? 1 : 0}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { part, geos: [] };
      buckets.set(key, bucket);
    }
    bucket.geos.push(buildPartGeometry(part));
  }

  const groups: MergedGroup[] = [];
  for (const [key, { part, geos }] of buckets) {
    const merged = mergeGeometries(geos, false);
    // mergeGeometries clones into a new buffer; the sources are now dead weight.
    for (const g of geos) g.dispose();
    if (!merged) continue;
    live += 1;
    groups.push({
      key,
      mat: part.mat,
      geometry: merged,
      castShadow: part.castShadow ?? false,
      receiveShadow: part.receiveShadow ?? false,
    });
  }
  return groups;
}

export function disposeMergedGroups(groups: MergedGroup[]) {
  for (const g of groups) {
    g.geometry.dispose();
    live -= 1;
  }
}

/**
 * Count of merged geometries currently alive.
 *
 * Merged buffers are built per component instance, so a component that mounts
 * and unmounts repeatedly (navigating to /3dsim and back) leaks one buffer per
 * merge group per mount unless it disposes. This counter makes that visible to
 * the capture harness.
 */
let live = 0;
export function liveMergedGeometryCount() {
  return live;
}
