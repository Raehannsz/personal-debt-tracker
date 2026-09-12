import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Person, Debt, Payment, Settings } from '../types';

function useCollectionData<T>(name: string): T[] {
  const [data, setData] = useState<T[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, name),
      (snap) => setData(snap.docs.map((d) => d.data() as T)),
      (err) => console.error(`Gagal memuat ${name}:`, err)
    );
    return unsub;
  }, [name]);
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

export function useSettings(): Settings {
  const [settings, setSettings] = useState<Settings>({ id: 'settings', myPersonId: null, theme: 'light' });
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'meta', 'settings'),
      (snap) => {
        if (snap.exists()) setSettings(snap.data() as Settings);
      },
      (err) => console.error('Gagal memuat settings:', err)
    );
    return unsub;
  }, []);
  return settings;
}

export function usePerson(id: string | undefined): Person | undefined {
  const [person, setPerson] = useState<Person | undefined>(undefined);
  useEffect(() => {
    if (!id) {
      setPerson(undefined);
      return;
    }
    const unsub = onSnapshot(
      doc(db, 'persons', id),
      (snap) => setPerson(snap.exists() ? (snap.data() as Person) : undefined),
      (err) => console.error('Gagal memuat person:', err)
    );
    return unsub;
  }, [id]);
  return person;
}

export function useDebt(id: string | undefined): Debt | undefined {
  const [debt, setDebt] = useState<Debt | undefined>(undefined);
  useEffect(() => {
    if (!id) {
      setDebt(undefined);
      return;
    }
    const unsub = onSnapshot(
      doc(db, 'debts', id),
      (snap) => setDebt(snap.exists() ? (snap.data() as Debt) : undefined),
      (err) => console.error('Gagal memuat debt:', err)
    );
    return unsub;
  }, [id]);
  return debt;
}

export function usePaymentsForDebt(debtId: string | undefined): Payment[] {
  const allPayments = usePayments();
  const payments = debtId ? allPayments.filter((p) => p.debtId === debtId) : [];
  return [...payments].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
}
