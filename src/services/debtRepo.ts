import { db, genId, nowISO } from '../lib/db';
import type { Debt, Payment } from '../types';
import { computeDebtStatus } from './debtLogic';

export async function listDebts(): Promise<Debt[]> {
  const all = await db.debts.toArray();
  return all.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
}

export async function listPayments(): Promise<Payment[]> {
  return db.payments.toArray();
}

export async function getDebt(id: string): Promise<Debt | undefined> {
  return db.debts.get(id);
}

export async function getPaymentsForDebt(debtId: string): Promise<Payment[]> {
  const payments = await db.payments.where('debtId').equals(debtId).toArray();
  return payments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
}

export async function createDebt(input: {
  debtorId: string;
  creditorId: string;
  amount: number;
  description?: string;
  transactionDate: string;
  dueDate?: string | null;
}): Promise<Debt> {
  const now = nowISO();
  const debt: Debt = {
    id: genId(),
    debtorId: input.debtorId,
    creditorId: input.creditorId,
    amount: input.amount,
    description: input.description?.trim() || undefined,
    transactionDate: input.transactionDate,
    dueDate: input.dueDate || null,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };
  await db.debts.add(debt);
  return debt;
}

export async function updateDebt(
  id: string,
  input: {
    debtorId: string;
    creditorId: string;
    amount: number;
    description?: string;
    transactionDate: string;
    dueDate?: string | null;
  }
): Promise<void> {
  const debt = await db.debts.get(id);
  if (!debt) return;
  const payments = await getPaymentsForDebt(id);
  const updated: Partial<Debt> = {
    debtorId: input.debtorId,
    creditorId: input.creditorId,
    amount: input.amount,
    description: input.description?.trim() || undefined,
    transactionDate: input.transactionDate,
    dueDate: input.dueDate || null,
    updatedAt: nowISO(),
  };
  updated.status = computeDebtStatus({ ...debt, ...updated } as Debt, payments);
  await db.debts.update(id, updated);
}

export async function cancelDebt(id: string): Promise<void> {
  await db.debts.update(id, { status: 'CANCELLED', updatedAt: nowISO() });
}

export async function deleteDebt(id: string): Promise<void> {
  await db.payments.where('debtId').equals(id).delete();
  await db.debts.delete(id);
}

export async function addPayment(input: {
  debtId: string;
  amount: number;
  paymentDate: string;
  notes?: string;
}): Promise<Payment> {
  const payment: Payment = {
    id: genId(),
    debtId: input.debtId,
    amount: input.amount,
    paymentDate: input.paymentDate,
    notes: input.notes?.trim() || undefined,
    createdAt: nowISO(),
  };
  await db.payments.add(payment);

  const debt = await db.debts.get(input.debtId);
  if (debt) {
    const allPayments = await getPaymentsForDebt(input.debtId);
    const status = computeDebtStatus(debt, allPayments);
    await db.debts.update(debt.id, { status, updatedAt: nowISO() });
  }
  return payment;
}

/**
 * Lunasi sekaligus (satu klik) semua hutang aktif/sebagian antara dua orang, dua arah.
 * Otomatis mencatat pembayaran sebesar sisa hutang masing-masing transaksi — tidak perlu input nominal manual.
 */
export async function settleAllBetween(personAId: string, personBId: string): Promise<void> {
  const related = await db.debts
    .filter(
      (d) =>
        ((d.debtorId === personAId && d.creditorId === personBId) ||
          (d.debtorId === personBId && d.creditorId === personAId)) &&
        (d.status === 'ACTIVE' || d.status === 'PARTIAL')
    )
    .toArray();

  for (const debt of related) {
    const payments = await getPaymentsForDebt(debt.id);
    const paidSoFar = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, debt.amount - paidSoFar);
    if (remaining <= 0) continue;
    await db.payments.add({
      id: genId(),
      debtId: debt.id,
      amount: remaining,
      paymentDate: nowISO(),
      notes: 'Lunas otomatis',
      createdAt: nowISO(),
    });
    await db.debts.update(debt.id, { status: 'PAID', updatedAt: nowISO() });
  }
}

/** Hapus SEMUA hutang beserta seluruh riwayat pembayarannya. Data orang tidak ikut terhapus. */
export async function deleteAllDebts(): Promise<void> {
  await db.transaction('rw', db.debts, db.payments, async () => {
    await db.payments.clear();
    await db.debts.clear();
  });
}
