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

interface GenericObject {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// Order of the objects matter! The second object is treated as the updated version of the first object
export function findDifferencesInPrimitiveStates<T extends GenericObject>(firstObj: T, secondObj: T) {
  const updates: Partial<T> = {};

  Object.entries(secondObj).forEach(([key, value]) => {
    const firstVal = firstObj[key];
    const secondVal = secondObj[key];

    if (isArray(firstVal) && isArray(secondVal)) {
      if (!arraysAreEqual([...firstVal], [...secondVal])) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updates[key as keyof T] = [...value] as any;
      }
    } else if (typeof firstVal === 'object' && !isArray(firstVal) && typeof secondVal === 'object') {
      if (firstVal === null && secondVal === null) {
        return;
      }
      if ((firstVal === null || secondVal === null) && firstVal !== secondVal) {
        updates[key as keyof T] = value;
      } else if (Object.keys(findDifferencesInPrimitiveStates(firstVal, secondVal)).length > 0) {
        updates[key as keyof T] = { ...firstVal, ...value };
      }
    } else if (firstVal !== secondVal) {
      updates[key as keyof T] = value;
    }
  });

  return updates;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function capitalizeFirstLetter(input: any) {
  const inputString = input.toString();
  if (inputString.length > 0) {
    return `${inputString[0].toUpperCase()}${inputString.slice(1)}`;
  }
  return inputString;
}

export function getTrrackLabel(updates: Partial<ProvState>, previousState: ProvState) {
  let label = '';

  if (updates.selectNeighbors !== undefined) {
    label = `Select Neighbors Set: ${capitalizeFirstLetter(updates.selectNeighbors)}`;
  } else if (updates.displayCharts !== undefined) {
    label = `Display Charts Set: ${capitalizeFirstLetter(updates.displayCharts)}`;
  } else if (updates.directionalEdges !== undefined) {
    label = `Directional Edges Set: ${capitalizeFirstLetter(updates.directionalEdges)}`;
  } else if (updates.selectedNodes !== undefined) {
    if (updates.selectedNodes.every((nodeID) => previousState.selectedNodes.includes(nodeID))) {
      label = previousState.selectedNodes.length - updates.selectedNodes.length === 1 ? 'One Node Deselected' : 'Multiple Nodes Deselected';
    } else {
      label = updates.selectedNodes.length - previousState.selectedNodes.length === 1 ? 'One Node Selected' : 'Multiple Nodes Selected';
    }
  } else if (updates.nestedVariables !== undefined) {
    const type = updates.nestedVariables.bar.length === previousState.nestedVariables.bar.length && updates.nestedVariables.bar.every((barVar) => previousState.nestedVariables.bar.includes(barVar)) ? 'glyph' : 'bar';
    const added = updates.nestedVariables[type].length > previousState.nestedVariables[type].length;
    const varName = added ? updates.nestedVariables[type].find((name) => !previousState.nestedVariables[type].includes(name)) : previousState.nestedVariables[type].find((name) => updates.nestedVariables && !updates.nestedVariables[type].includes(name));

    const prettyVarName = `${capitalizeFirstLetter(varName)}s`;
    const prettyType = `${capitalizeFirstLetter(type)}s`;

    label = added ? `${prettyVarName} Added To ${prettyType}` : `${prettyVarName} Removed From ${prettyType}`;
  } else if (updates.labelVariable !== undefined) {
    label = updates.labelVariable === null ? 'Label Variable Removed' : `Label Variable Set: ${capitalizeFirstLetter(updates.labelVariable)}`;
  } else if (updates.edgeVariables !== undefined) {
    const changedEntry = Object.entries(updates.edgeVariables).find(([key, currentValue]) => currentValue !== previousState.edgeVariables[key as 'width' | 'color']);
    if (changedEntry !== undefined) {
      const type = capitalizeFirstLetter(changedEntry[0]);
      label = changedEntry[1] !== '' ? `Edge ${type} Variable Set: ${capitalizeFirstLetter(changedEntry[1])}` : `Edge ${type} Variable Removed`;
    }
  } else if (updates.nodeSizeVariable !== undefined) {
    label = updates.nodeSizeVariable === '' ? 'Node Size Variable Removed' : `Node Size Variable Set: ${capitalizeFirstLetter(updates.nodeSizeVariable)}`;
  } else if (updates.nodeColorVariable !== undefined) {
    label = updates.nodeColorVariable === '' ? 'Node Color Variable Removed' : `Node Color Variable Set: ${capitalizeFirstLetter(updates.nodeColorVariable)}`;
  } else if (updates.layoutVars !== undefined) {
    const changedEntry = Object.entries(updates.layoutVars).find(([key, currentValue]) => currentValue !== previousState.layoutVars[key as 'x' | 'y']);
    if (changedEntry !== undefined) {
      const axis = changedEntry[0].toUpperCase();
      label = changedEntry[1] !== null ? `Layout ${axis} By ${capitalizeFirstLetter(capitalizeFirstLetter(changedEntry[1]))}` : `Remove ${axis} Layout`;
    }
  } else if (updates.markerSize !== undefined) {
    label = `Marker Size Set: ${updates.markerSize}`;
  } else if (updates.fontSize !== undefined) {
    label = `Font Size Set: ${updates.fontSize}`;
  } else if (updates.edgeLength !== undefined) {
    label = `Edge Length Set: ${updates.edgeLength}`;
  } else {
    label = 'Unknown Update';
  }

  return label;
}
