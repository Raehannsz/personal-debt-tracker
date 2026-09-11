import { db, genId, nowISO } from '../lib/db';
import type { Person } from '../types';

export async function listPersons(includeDeleted = false): Promise<Person[]> {
  const all = await db.persons.toArray();
  const filtered = includeDeleted ? all : all.filter((p) => !p.deletedAt);
  return filtered.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPerson(id: string): Promise<Person | undefined> {
  return db.persons.get(id);
}

export async function createPerson(input: {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
}): Promise<Person> {
  const now = nowISO();
  const person: Person = {
    id: genId(),
    name: input.name.trim(),
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.persons.add(person);
  return person;
}

export async function updatePerson(
  id: string,
  input: { name: string; phone?: string; email?: string; notes?: string }
): Promise<void> {
  await db.persons.update(id, {
    name: input.name.trim(),
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    updatedAt: nowISO(),
  });
}

export async function personHasActiveDebts(id: string): Promise<boolean> {
  const debts = await db.debts
    .filter((d) => (d.debtorId === id || d.creditorId === id) && d.status !== 'CANCELLED')
    .toArray();
  return debts.length > 0;
}

/** Soft delete jika masih punya transaksi; hard delete jika bersih. Return true jika berhasil dihapus permanen. */
export async function deletePerson(id: string): Promise<void> {
  const hasDebts = await personHasActiveDebts(id);
  if (hasDebts) {
    await db.persons.update(id, { deletedAt: nowISO(), updatedAt: nowISO() });
  } else {
    await db.persons.delete(id);
  }
}
