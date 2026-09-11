import { db, genId, nowISO } from '../lib/db';
import type { Person, Debt } from '../types';

export async function isEmpty(): Promise<boolean> {
  const count = await db.persons.count();
  return count === 0;
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

  await db.persons.bulkAdd(persons);
  await db.debts.bulkAdd(debts);
  await db.settings.put({ id: 'settings', myPersonId: andi.id, theme: 'light' });
}

export async function clearDemoData(): Promise<void> {
  await db.transaction('rw', db.persons, db.debts, db.payments, db.settings, async () => {
    await db.persons.clear();
    await db.debts.clear();
    await db.payments.clear();
    await db.settings.clear();
  });
}
