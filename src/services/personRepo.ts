import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db, genId, nowISO } from '../lib/firebase';
import type { Person } from '../types';

export async function getPerson(id: string): Promise<Person | undefined> {
  const snap = await getDoc(doc(db, 'persons', id));
  return snap.exists() ? (snap.data() as Person) : undefined;
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
  // Document id sengaja disamakan dengan person.id supaya gampang direferensikan dari debts/payments.
  await setDoc(doc(db, 'persons', person.id), person);
  return person;
}

export async function updatePerson(
  id: string,
  input: { name: string; phone?: string; email?: string; notes?: string }
): Promise<void> {
  await updateDoc(doc(db, 'persons', id), {
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    notes: input.notes?.trim() || null,
    updatedAt: nowISO(),
  });
}

export async function personHasActiveDebts(id: string): Promise<boolean> {
  const debtsCol = collection(db, 'debts');
  const [asDebtor, asCreditor] = await Promise.all([
    getDocs(query(debtsCol, where('debtorId', '==', id))),
    getDocs(query(debtsCol, where('creditorId', '==', id))),
  ]);
  const all = [...asDebtor.docs, ...asCreditor.docs];
  return all.some((d) => d.data().status !== 'CANCELLED');
}

export async function deletePerson(id: string): Promise<void> {
  const hasDebts = await personHasActiveDebts(id);
  if (hasDebts) {
    await updateDoc(doc(db, 'persons', id), { deletedAt: nowISO(), updatedAt: nowISO() });
  } else {
    await deleteDoc(doc(db, 'persons', id));
  }
}
