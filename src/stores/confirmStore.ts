import { useSyncExternalStore } from 'react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve: ((value: boolean) => void) | null;
}

let state: ConfirmState = {
  open: false,
  title: '',
  message: '',
  resolve: null,
};

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    state = { ...options, open: true, resolve };
    emit();
  });
}

export function resolveConfirm(value: boolean): void {
  state.resolve?.(value);
  state = { ...state, open: false, resolve: null };
  emit();
}

export function useConfirmState(): ConfirmState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state
  );
}
