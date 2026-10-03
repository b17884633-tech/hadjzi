import { Resource } from './resource';

export interface UIState<T> {
  resource: Resource<T>;
  refreshing: boolean;
}

export function initialUIState<T>(): UIState<T> {
  return { resource: { status: 'idle' }, refreshing: false };
}
