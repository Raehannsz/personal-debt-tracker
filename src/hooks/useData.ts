import { useEffect, useState, useMemo, useSyncExternalStore } from 'react';
import { supabase } from '../lib/supabase';
import type { Person, Debt, Payment, Settings } from '../types';

// Cache global untuk mencegah "layar kosong" saat navigasi
const globalCache = new Map<string, any[]>();

// ─── Status "data sudah termuat" (dipakai untuk skeleton loading) ───
export type DataKey = 'persons' | 'debts' | 'payments' | 'settings';

const loadedKeys = new Set<DataKey>();
const loadListeners = new Set<() => void>();

function markLoaded(key: DataKey) {
  if (loadedKeys.has(key)) return;
  loadedKeys.add(key);
  loadListeners.forEach((l) => l());
}

function subscribeLoaded(listener: () => void) {
  loadListeners.add(listener);
  return () => {
    loadListeners.delete(listener);
  };
}

/**
 * true jika SEMUA key yang diminta sudah pernah berhasil dimuat dari Supabase.
 * Setelah pertama kali termuat, nilainya tetap true (data ada di cache),
 * jadi pindah halaman tidak memunculkan skeleton lagi.
 */
export function useDataReady(keys: DataKey[]): boolean {
  return useSyncExternalStore(
    subscribeLoaded,
    () => keys.every((k) => loadedKeys.has(k))
  );
}

function useCollectionData<T>(
  table: 'persons' | 'debts' | 'payments'
): T[] {
  const [data, setData] = useState<T[]>(
    () => globalCache.get(table) || []
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data: rows, error } = await supabase
        .from(table)
        .select('*');

      if (error) {
        console.error(`Gagal memuat ${table}:`, error);
        markLoaded(table);
        return;
      }

      if (!active) return;

      const newData = (rows ?? []) as T[];

      globalCache.set(table, newData);
      setData(newData);
      markLoaded(table);
    };

    void load();

    // Nama channel dibuat unik untuk instance effect ini
    const channel = supabase
      .channel(`realtime-${table}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
        },
        () => {
          if (active) {
            void load();
          }
        }
      );

    // PENTING:
    // .on() sudah selesai SEBELUM .subscribe()
    channel.subscribe((status, error) => {
      if (error) {
        console.error(
          `Realtime subscription error: ${table}`,
          error
        );
      }

      if (status === 'SUBSCRIBED') {
        console.log(`✓ Realtime subscribed: ${table}`);
      }
    });

    return () => {
      active = false;

      // Tidak perlu await.
      // Supabase akan menghentikan channel ini.
      void supabase.removeChannel(channel);
    };
  }, [table]);

  return data;
}

export function usePersons(includeDeleted = false): Person[] {
  const persons = useCollectionData<Person>('persons');
  const filtered = includeDeleted ? persons : persons.filter((p) => !p.deletedAt);
  return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
}

export function useDebts(): Debt[] {
  const debts = useCollectionData<Debt>('debts');
  return [...debts].sort(
    (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
  );
}

export function usePayments(): Payment[] {
  return useCollectionData<Payment>('payments');
}

// ─── Settings: SATU store bersama untuk seluruh aplikasi ───
// Sebelumnya setiap komponen yang memanggil useSettings() membuat state + channel
// realtime sendiri dengan nama channel yang sama, sehingga perubahan dari perangkat
// lain bisa tidak sampai ke komponen yang menerapkan tema. Sekarang hanya ada
// satu state, satu fetch, dan satu channel.

function readInitialSettings(): Settings {
  let cachedTheme: Settings['theme'] = 'light';
  try {
    if (localStorage.getItem('theme') === 'dark') cachedTheme = 'dark';
  } catch {
    // Abaikan
  }
  return { id: 'settings', myPersonId: null, theme: cachedTheme };
}

let settingsState: Settings = readInitialSettings();
const settingsListeners = new Set<() => void>();
let settingsSyncStarted = false;
let lastLocalUpdateAt = 0;

// Abaikan event realtime yang datang tepat setelah perubahan lokal
// (itu gema dari perubahan kita sendiri).
const LOCAL_ECHO_WINDOW_MS = 1500;

function subscribeSettings(listener: () => void) {
  settingsListeners.add(listener);
  return () => {
    settingsListeners.delete(listener);
  };
}

function getSettingsSnapshot() {
  return settingsState;
}

function setSettingsState(next: Settings) {
  settingsState = next;
  settingsListeners.forEach((l) => l());
}

function applyTheme(theme: Settings['theme'] | undefined) {
  if (theme !== 'dark' && theme !== 'light') return;
  try {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  } catch {
    // Abaikan
  }
}

async function loadSettings(fromRemoteEvent = false) {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 'settings')
    .maybeSingle();

  if (error) {
    console.error('Gagal memuat settings:', error);
    markLoaded('settings');
    return;
  }

  markLoaded('settings');
  if (!data) return;

  // Jangan timpa perubahan lokal yang baru saja kita buat
  if (fromRemoteEvent && Date.now() - lastLocalUpdateAt < LOCAL_ECHO_WINDOW_MS) return;

  const next = data as Settings;
  setSettingsState(next);
  applyTheme(next.theme); // tema ikut berubah walau perubahan datang dari perangkat lain
}

function ensureSettingsSync() {
  if (settingsSyncStarted) return;
  settingsSyncStarted = true;

  void loadSettings();

  // PENTING: .on() SEBELUM .subscribe()
  const channel = supabase
    .channel('realtime-app_settings-shared')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_settings' },
      () => {
        void loadSettings(true);
      }
    );

  channel.subscribe((status, error) => {
    if (status === 'SUBSCRIBED') {
      console.log('✓ Settings realtime subscribed');
    }
    if (error || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.error('✗ Settings subscription error:', status, error);
    }
  });

  // Cadangan: koneksi realtime sering putus saat tab/HP tidur.
  // Saat tab aktif kembali, ambil ulang supaya tema & profil langsung sinkron.
  const refetchWhenVisible = () => {
    if (document.visibilityState === 'visible') void loadSettings(true);
  };
  document.addEventListener('visibilitychange', refetchWhenVisible);
  window.addEventListener('focus', refetchWhenVisible);
}

function updateSettingsLocal(newSettings: Partial<Settings>) {
  lastLocalUpdateAt = Date.now();
  setSettingsState({ ...settingsState, ...newSettings });
}

export function useSettings() {
  useEffect(() => {
    ensureSettingsSync();
  }, []);

  const settings = useSyncExternalStore(subscribeSettings, getSettingsSnapshot);

  return useMemo(
    () => ({ ...settings, updateSettingsLocal }),
    [settings]
  ) as Settings & { updateSettingsLocal: (s: Partial<Settings>) => void };
}

export function usePerson(id: string | undefined): Person | undefined {
  const persons = useCollectionData<Person>('persons');
  return id ? persons.find((person) => person.id === id) : undefined;
}

export function useDebt(id: string | undefined): Debt | undefined {
  const debts = useCollectionData<Debt>('debts');
  return id ? debts.find((debt) => debt.id === id) : undefined;
}

export function usePaymentsForDebt(debtId: string | undefined): Payment[] {
  const allPayments = usePayments();
  const payments = debtId ? allPayments.filter((p) => p.debtId === debtId) : [];
  return [...payments].sort(
    (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
  );
}