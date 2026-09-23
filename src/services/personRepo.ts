import { supabase, genId, nowISO } from '../lib/supabase';
import type { Person } from '../types';

export async function getPerson(id: string): Promise<Person | undefined> {
  const { data, error } = await supabase.from('persons').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Person | undefined;
}
export async function createPerson(input: { name: string; phone?: string; email?: string; notes?: string }): Promise<Person> {
  const now = nowISO();
  const person: Person = { id: genId(), name: input.name.trim(), phone: input.phone?.trim() || undefined, email: input.email?.trim() || undefined, notes: input.notes?.trim() || undefined, deletedAt: null, createdAt: now, updatedAt: now };
  const { error } = await supabase.from('persons').insert(person);
  if (error) throw error;
  return person;
}
export async function updatePerson(id: string, input: { name: string; phone?: string; email?: string; notes?: string }): Promise<void> {
  const { error } = await supabase.from('persons').update({ name: input.name.trim(), phone: input.phone?.trim() || null, email: input.email?.trim() || null, notes: input.notes?.trim() || null, updatedAt: nowISO() }).eq('id', id);
  if (error) throw error;
}
export async function personHasActiveDebts(id: string): Promise<boolean> {
  const [debtorResult, creditorResult] = await Promise.all([
    supabase.from('debts').select('status').eq('debtorId', id),
    supabase.from('debts').select('status').eq('creditorId', id),
  ]);
  if (debtorResult.error) throw debtorResult.error;
  if (creditorResult.error) throw creditorResult.error;
  return [...(debtorResult.data ?? []), ...(creditorResult.data ?? [])].some(
    (debt) => debt.status !== 'CANCELLED',
  );
}
export async function deletePerson(id: string): Promise<void> {
  const hasDebts = await personHasActiveDebts(id);
  const result = hasDebts ? await supabase.from('persons').update({ deletedAt: nowISO(), updatedAt: nowISO() }).eq('id', id) : await supabase.from('persons').delete().eq('id', id);
  if (result.error) throw result.error;
}