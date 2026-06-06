import { useSyncExternalStore } from 'react';

export type BioflowState = 'idle' | 'success' | 'error' | 'delete' | 'thinking';

class BioflowStoreClass {
  private state: BioflowState = 'idle';
  private listeners: Set<() => void> = new Set();
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  public getState = () => {
    return this.state;
  };

  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public trigger = (newState: BioflowState, durationMs: number = 2500) => {
    this.state = newState;
    this.emit();

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    if (newState !== 'idle') {
      this.timeoutId = setTimeout(() => {
        this.state = 'idle';
        this.emit();
      }, durationMs);
    }
  };

  private emit = () => {
    for (const listener of this.listeners) {
      listener();
    }
  };
}

export const bioflowStore = new BioflowStoreClass();

export function useBioflowState() {
  return useSyncExternalStore(bioflowStore.subscribe, bioflowStore.getState);
}
