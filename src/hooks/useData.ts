import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Person, Debt, Payment, Settings } from '../types';

function useCollectionData<T>(table: 'persons' | 'debts' | 'payments'): T[] {
  const [data, setData] = useState<T[]>([]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: rows, error } = await supabase.from(table).select('*');
      if (error) { console.error(`Gagal memuat ${table}:`, error); return; }
      if (active) setData((rows ?? []) as T[]);
    };
    void load();
    const channel = supabase.channel(`${table}-changes-${crypto.randomUUID()}`).on('postgres_changes', { event: '*', schema: 'public', table }, () => void load()).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
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
  return [...debts].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
}
export function usePayments(): Payment[] { return useCollectionData<Payment>('payments'); }

export function useSettings(): Settings {
  const [settings, setSettings] = useState<Settings>({ id: 'settings', myPersonId: null, theme: 'light' });
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error } = await supabase.from('app_settings').select('*').eq('id', 'settings').maybeSingle();
      if (error) { console.error('Gagal memuat settings:', error); return; }
      if (active && data) setSettings(data as Settings);
    };
    void load();
    const channel = supabase.channel(`settings-changes-${crypto.randomUUID()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => void load()).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, []);
  return settings;
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
  return [...payments].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
}