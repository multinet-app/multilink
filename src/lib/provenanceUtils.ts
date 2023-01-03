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

// Order of the objects matter! The second object is treated as the updated version of the first object
export function findDifferencesInPrimitiveStates(firstObj: ProvState, secondObj: ProvState) {
  const updates: Partial<ProvState> = {};

  Object.entries(secondObj).forEach(([key, value]) => {
    if (firstObj[key as keyof ProvState] !== secondObj[key as keyof ProvState]) {
      updates[key as keyof ProvState] = value;
    }
  });

  return updates;
}
