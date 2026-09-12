import { collection, doc, writeBatch, getDocs, query, limit } from 'firebase/firestore';
import { db, genId, nowISO } from '../lib/firebase';
import type { Person, Debt } from '../types';

export async function isEmpty(): Promise<boolean> {
  const snap = await getDocs(query(collection(db, 'persons'), limit(1)));
  return snap.empty;
}

export async function seedDemoData(): Promise<void> {
  const now = nowISO();
  const names = ['Andi', 'Budi', 'Citra', 'Deni'];
  const persons: Person[] = names.map((name, i) => ({
    id: genId(),
    name,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    isMe: i === 0,
  }));
  const [andi, budi, citra, deni] = persons;

  const pairs: [Person, Person, number][] = [
    [andi, budi, 100000],
    [budi, citra, 50000],
    [citra, deni, 75000],
    [deni, andi, 25000],
    [andi, citra, 200000],
  ];

  const debts: Debt[] = pairs.map(([debtor, creditor, amount]) => ({
    id: genId(),
    debtorId: debtor.id,
    creditorId: creditor.id,
    amount,
    description: 'Data contoh',
    transactionDate: now,
    dueDate: null,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  }));

  const batch = writeBatch(db);
  persons.forEach((p) => batch.set(doc(db, 'persons', p.id), p));
  debts.forEach((d) => batch.set(doc(db, 'debts', d.id), d));
  batch.set(doc(db, 'meta', 'settings'), { id: 'settings', myPersonId: andi.id, theme: 'light' });
  await batch.commit();
}

async function clearCollection(name: string): Promise<void> {
  const snap = await getDocs(collection(db, name));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function clearDemoData(): Promise<void> {
  await Promise.all([clearCollection('persons'), clearCollection('debts'), clearCollection('payments')]);
}
