import { useEffect } from 'react';
import { mergeStaticParts, disposeMergedGroups } from './merge';
import type { StaticPart, MergedGroup } from './merge';

interface CacheEntry {
  groups: MergedGroup[];
  refs: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Build merged static geometry once per key and share it across every mount.
 *
 * Two things make a naive `useMemo` wrong here:
 *
 * 1. **The scene mounts more than once.** `SimulationView` (Overview) and
 *    `ThreeDSimPage` both render the machine, so navigating between them built a
 *    second full set of merged buffers. Nothing freed the first — eight
 *    navigations leaked 504 geometries.
 *
 * 2. **StrictMode double-invokes effects.** Disposing in a `useEffect` cleanup
 *    therefore frees the buffers immediately after the first mount, while the
 *    scene is still drawing with them.
 *
 * Refcounting solves both: the merge runs once for a given key, every mount
 * shares it, and the buffers are freed only when the last consumer unmounts. A
 * StrictMode mount/cleanup/mount cycle nets out to a refcount of 1.
 *
 * `key` must be unique per part set and stable across mounts — use the
 * component name.
 */
export function useMergedParts(key: string, build: () => StaticPart[]): MergedGroup[] {
  let entry = cache.get(key);
  if (!entry) {
    entry = { groups: mergeStaticParts(build()), refs: 0 };
    cache.set(key, entry);
  }

  useEffect(() => {
    const current = cache.get(key);
    if (!current) return;
    current.refs += 1;

    return () => {
      const onUnmount = cache.get(key);
      if (!onUnmount) return;
      onUnmount.refs -= 1;
      if (onUnmount.refs <= 0) {
        disposeMergedGroups(onUnmount.groups);
        cache.delete(key);
      }
    };
  }, [key]);

  return entry.groups;
}
