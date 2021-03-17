import { InternalField, internalFieldNames } from '@/types';

// Disable no explicit any, since there are type errors for string and unknown
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isInternalField(candidate: any): candidate is InternalField {
  return internalFieldNames.includes(candidate);
}
