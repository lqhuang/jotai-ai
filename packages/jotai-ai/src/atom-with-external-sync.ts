import type { Atom } from './jotai';

import { atom } from './jotai';

/**
 * @param sourceAtom  an `Atom` holding the external source.
 * @param snapshot    Pure function: get snapshot value from source.
 * @param subscribe   Registers a `update` callback on the external source.
 *                    Returns an unsubscribe function.
 */
export function atomWithExternalSync<Source, Value>(
  sourceAtom: Atom<Source>,
  snapshot: (source: Source) => Value,
  subscribe: (source: Source, update: () => void) => () => void,
): Atom<Value> {
  // Creates a `snapshotAtom` (PrimitiveAtom),
  // `snapshotAtom.onMount` subscribes to the external source and writes
  // new snapshots into the Jotai store when the source fires.
  //
  // When sourceAtom changes, the old snapshotAtom is unmounted,
  // a fresh one is created and mounted for the new source.
  const containerAtom = atom(get => {
    const source = get(sourceAtom);
    const snapshotAtom = atom<Value>(snapshot(source));

    snapshotAtom.onMount = setAtom =>
      subscribe(source, () => setAtom(snapshot(source)));

    return snapshotAtom;
  });

  return atom(get => get(get(containerAtom)));
}
