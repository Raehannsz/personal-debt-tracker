import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { Person, Debt, Payment, Settings } from '../types';

export function usePersons(includeDeleted = false): Person[] {
  const persons = useLiveQuery(() => db.persons.toArray(), [], []);
  const filtered = includeDeleted ? persons : (persons ?? []).filter((p) => !p.deletedAt);
  return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
}

export function useDebts(): Debt[] {
  const debts = useLiveQuery(() => db.debts.toArray(), [], []);
  return [...(debts ?? [])].sort(
    (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
  );
}

export function usePayments(): Payment[] {
  return useLiveQuery(() => db.payments.toArray(), [], []) ?? [];
}

export function useSettings(): Settings {
  const s = useLiveQuery(() => db.settings.get('settings'), [], undefined);
  return s ?? { id: 'settings', myPersonId: null, theme: 'light' };
}

export function usePerson(id: string | undefined): Person | undefined {
  return useLiveQuery(() => (id ? db.persons.get(id) : undefined), [id], undefined);
}

export function useDebt(id: string | undefined): Debt | undefined {
  return useLiveQuery(() => (id ? db.debts.get(id) : undefined), [id], undefined);
}

export function usePaymentsForDebt(debtId: string | undefined): Payment[] {
  const payments = useLiveQuery(
    () => (debtId ? db.payments.where('debtId').equals(debtId).toArray() : []),
    [debtId],
    []
  );
  return [...(payments ?? [])].sort(
    (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
  );
}
