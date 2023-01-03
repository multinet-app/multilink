import { ProvState } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function undoRedoKeyHandler(event: KeyboardEvent, provenance: any) {
  if (
    (event.ctrlKey && event.key === 'z' && !event.shiftKey) // ctrl + z (no shift)
    || (event.metaKey && event.key === 'z' && !event.shiftKey) // meta + z (no shift)
  ) {
    if (provenance.current.id !== provenance.root.id) {
      provenance.undo();
    }
  } else if (
    (event.ctrlKey && event.key === 'y') // ctrl + y
    || (event.ctrlKey && event.key === 'z' && event.shiftKey) // ctrl + shift + z
    || (event.metaKey && event.key === 'y') // meta + y
    || (event.metaKey && event.key === 'z' && event.shiftKey) // meta + shift + z
  ) {
    if (provenance.current.children.length > 0) {
      provenance.redo();
    }
  }
}

export function isArray(input: unknown): input is Array<string> {
  return typeof input === 'object' && input !== null && input.constructor === Array;
}

function arraysAreEqual<T>(a: T[], b: T[]) {
  return a.length === b.length && a.every((element, index) => element === b[index]);
}

// Order of the objects matter! The second object is treated as the updated version of the first object
export function findDifferencesInPrimitiveStates(firstObj: ProvState, secondObj: ProvState) {
  const updates: Partial<ProvState> = {};

  Object.entries(secondObj).forEach(([key, value]) => {
    const firstVal = firstObj[key as keyof ProvState];
    const secondVal = secondObj[key as keyof ProvState];

    if (isArray(firstVal) && isArray(secondVal)) {
      if (!arraysAreEqual([...firstVal], [...secondVal])) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updates[key as keyof ProvState] = [...value] as any;
      }
    } else if (firstVal !== secondVal) {
      updates[key as keyof ProvState] = value;
    }
  });

  return updates;
}
