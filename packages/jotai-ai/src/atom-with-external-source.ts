import type { Atom } from './jotai';

import { atom } from './jotai';

/**
 * @param sourceAtom  an `Atom` holding the external source.
 * @param snapshot    Pure function: get snapshot value from source.
 * @param subscribe   Registers an `update` callback on the external source.
 *                    Returns an unsubscribe function.
 * @param equalityFn  Compares consecutive snapshots. When it returns `true`
 *                    the write is skipped so downstream atoms and components
 *                    do not re-render needlessly. Defaults to `Object.is`.
 */
export function atomWithExternalSource<Source, Value>(
  sourceAtom: Atom<Source>,
  snapshot: (source: Source) => Value,
  subscribe: (source: Source, update: () => void) => () => void,
  equalityFn: (prev: Value, next: Value) => boolean = Object.is,
): Atom<Value> {
  // Per-store `WeakMap` cache: when the same source object reference is seen
  // again (e.g. toggling between two sources), we reuse the existing
  // `snapshotAtom` instead of tearing down and recreating the subscription.
  // Inspired by jotai-tanstack-query's `observerCacheAtom` pattern.
  //
  // Ref: <https://github.com/jotaijs/jotai-tanstack-query/blob/main/src/baseAtomWithQuery.ts>
  const cacheAtom = atom(() => new WeakMap<object, Atom<Value>>());

  const containerAtom = atom(get => {
    const source = get(sourceAtom);
    const cache = get(cacheAtom);

    if (source !== null && typeof source === 'object') {
      const cached = cache.get(source);
      if (cached) return cached;
    }

    const snapshotAtom = atom<Value>(snapshot(source));

    // Track mount state so we can refresh stale data on remount.
    let isMounted = false;
    snapshotAtom.onMount = setAtom => {
      if (isMounted) {
        setAtom(snapshot(source));
      }
      isMounted = true;

      let prev = snapshot(source);
      return subscribe(source, () => {
        const next = snapshot(source);
        // Skip writes when the snapshot is logically unchanged.
        // This avoids re-renders caused by wrapper objects that are always
        // a fresh reference even though their contents are identical.
        if (!equalityFn(prev, next)) {
          prev = next;
          setAtom(next);
        }
      });
    };

    if (source !== null && typeof source === 'object') {
      cache.set(source, snapshotAtom);
    }
    return snapshotAtom;
  });

  return atom(get => get(get(containerAtom)));
}
