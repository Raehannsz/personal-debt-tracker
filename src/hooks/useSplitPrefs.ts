import { useSyncExternalStore } from 'react';

// Preferensi pembagian "Bagi rata": apakah pemberi hutang (Kepada) ikut dihitung sebagai peserta.
// Disimpan di localStorage perangkat ini dan dibagikan ke semua komponen lewat satu store.
const KEY = 'split-include-creditor';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function setIncludeCreditor(value: boolean) {
  try {
    localStorage.setItem(KEY, value ? '1' : '0');
  } catch {
    // abaikan (mis. mode privat)
  }
  listeners.forEach((l) => l());
}

export function useSplitPrefs() {
  const includeCreditor = useSyncExternalStore(subscribe, read);
  return { includeCreditor, setIncludeCreditor };
}