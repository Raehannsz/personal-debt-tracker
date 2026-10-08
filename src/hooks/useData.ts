import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Person, Debt, Payment, Settings } from '../types';

// Cache global untuk mencegah "layar kosong" saat navigasi
const globalCache = new Map<string, any[]>();

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
        return;
      }

      if (!active) return;

      const newData = (rows ?? []) as T[];

      globalCache.set(table, newData);
      setData(newData);
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

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    let cachedTheme: Settings['theme'] = 'light';
    try {
      if (localStorage.getItem('theme') === 'dark') cachedTheme = 'dark';
    } catch {
      // Abaikan
    }
    return { id: 'settings', myPersonId: null, theme: cachedTheme };
  });

  const isLocalUpdate = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSubscribed = useRef(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 'settings')
        .maybeSingle();
      if (error) {
        console.error('Gagal memuat settings:', error);
        return;
      }
      if (active && data) {
        if (!isLocalUpdate.current) {
          setSettings(data as Settings);
        }
        isLocalUpdate.current = false;
      }
    };

    void load();

    const cleanup = async () => {
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribed.current = false;
      }
    };

    void cleanup().then(() => {
      if (!active || isSubscribed.current) return;

      const channel = supabase.channel('public:app_settings');
      channelRef.current = channel;

      // PENTING: .on() SEBELUM .subscribe()
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        () => {
          if (!isLocalUpdate.current) {
            void load();
          } else {
            isLocalUpdate.current = false;
          }
        }
      );

      channel.subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          isSubscribed.current = true;
          console.log('✓ Settings realtime subscribed');
        }
        if (error) {
          console.error('✗ Settings subscription error:', error);
        }
      });
    });

    return () => {
      active = false;
      void cleanup();
    };
  }, []);

  const updateSettingsLocal = useCallback((newSettings: Partial<Settings>) => {
    isLocalUpdate.current = true;
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  return {
    ...settings,
    updateSettingsLocal,
  } as Settings & { updateSettingsLocal: (s: Partial<Settings>) => void };
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