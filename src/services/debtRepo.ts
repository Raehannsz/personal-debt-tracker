import { supabase, genId, nowISO } from '../lib/supabase';
import type { Debt, Payment } from '../types';
import { computeDebtStatus } from './debtLogic';

async function rows<T>(table: 'debts' | 'payments'): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*');
  if (error) throw error;
  return (data ?? []) as T[];
}
export async function getDebt(id: string): Promise<Debt | undefined> { const { data, error } = await supabase.from('debts').select('*').eq('id', id).maybeSingle(); if (error) throw error; return data as Debt | undefined; }
export async function getPaymentsForDebt(debtId: string): Promise<Payment[]> { const { data, error } = await supabase.from('payments').select('*').eq('debtId', debtId); if (error) throw error; return ((data ?? []) as Payment[]).sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()); }
export async function createDebt(input: { debtorId: string; creditorId: string; amount: number; description?: string; transactionDate: string; dueDate?: string | null }): Promise<Debt> {
  const now = nowISO(); const debt: Debt = { id: genId(), debtorId: input.debtorId, creditorId: input.creditorId, amount: input.amount, description: input.description?.trim() || undefined, transactionDate: input.transactionDate, dueDate: input.dueDate || null, status: 'ACTIVE', createdAt: now, updatedAt: now };
  const { error } = await supabase.from('debts').insert(debt); if (error) throw error; return debt;
}
export async function updateDebt(id: string, input: { debtorId: string; creditorId: string; amount: number; description?: string; transactionDate: string; dueDate?: string | null }): Promise<void> {
  const debt = await getDebt(id); if (!debt) return; const merged: Debt = { ...debt, ...input, description: input.description?.trim() || undefined, dueDate: input.dueDate || null, updatedAt: nowISO() }; merged.status = computeDebtStatus(merged, await getPaymentsForDebt(id));
  const { error } = await supabase.from('debts').update(merged).eq('id', id); if (error) throw error;
}
export async function cancelDebt(id: string): Promise<void> { const { error } = await supabase.from('debts').update({ status: 'CANCELLED', updatedAt: nowISO() }).eq('id', id); if (error) throw error; }
export async function deleteDebt(id: string): Promise<void> { const { error } = await supabase.from('debts').delete().eq('id', id); if (error) throw error; }
export async function addPayment(input: { debtId: string; amount: number; paymentDate: string; notes?: string }): Promise<Payment> {
  const payment: Payment = { id: genId(), debtId: input.debtId, amount: input.amount, paymentDate: input.paymentDate, notes: input.notes?.trim() || undefined, createdAt: nowISO() };
  const { data, error } = await supabase.rpc('add_payment_and_update_debt', { payment_id: payment.id, payment_debt_id: payment.debtId, payment_amount: payment.amount, payment_date: payment.paymentDate, payment_notes: payment.notes ?? null, payment_created_at: payment.createdAt });
  if (error) throw error; return (data ?? payment) as Payment;
}
export async function settleAllBetween(personAId: string, personBId: string): Promise<void> {
  const debts = await rows<Debt>('debts'); const related = debts.filter((d) => ((d.debtorId === personAId && d.creditorId === personBId) || (d.debtorId === personBId && d.creditorId === personAId)) && (d.status === 'ACTIVE' || d.status === 'PARTIAL'));
  for (const debt of related) { const paid = (await getPaymentsForDebt(debt.id)).reduce((sum, payment) => sum + payment.amount, 0); const remaining = Math.max(0, debt.amount - paid); if (remaining > 0) await addPayment({ debtId: debt.id, amount: remaining, paymentDate: nowISO(), notes: 'Lunas otomatis' }); }
}
export async function deleteAllDebts(): Promise<void> { const { error } = await supabase.from('debts').delete().neq('id', ''); if (error) throw error; }