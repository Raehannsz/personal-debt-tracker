import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  runTransaction,
} from 'firebase/firestore';
import { db, genId, nowISO } from '../lib/firebase';
import type { Debt, Payment } from '../types';
import { computeDebtStatus } from './debtLogic';

export async function getDebt(id: string): Promise<Debt | undefined> {
  const snap = await getDoc(doc(db, 'debts', id));
  return snap.exists() ? (snap.data() as Debt) : undefined;
}

export async function getPaymentsForDebt(debtId: string): Promise<Payment[]> {
  const snap = await getDocs(query(collection(db, 'payments'), where('debtId', '==', debtId)));
  const payments = snap.docs.map((d) => d.data() as Payment);
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
  await setDoc(doc(db, 'debts', debt.id), debt);
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
  const debt = await getDebt(id);
  if (!debt) return;
  const payments = await getPaymentsForDebt(id);
  const merged: Debt = {
    ...debt,
    debtorId: input.debtorId,
    creditorId: input.creditorId,
    amount: input.amount,
    description: input.description?.trim() || undefined,
    transactionDate: input.transactionDate,
    dueDate: input.dueDate || null,
    updatedAt: nowISO(),
  };
  merged.status = computeDebtStatus(merged, payments);
  await updateDoc(doc(db, 'debts', id), { ...merged });
}

export async function cancelDebt(id: string): Promise<void> {
  await updateDoc(doc(db, 'debts', id), { status: 'CANCELLED', updatedAt: nowISO() });
}

export async function deleteDebt(id: string): Promise<void> {
  const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('debtId', '==', id)));
  await Promise.all(paymentsSnap.docs.map((p) => deleteDoc(p.ref)));
  await deleteDoc(doc(db, 'debts', id));
}

/**
 * Satu transaksi atomik: simpan pembayaran & update status debt sekaligus.
 * Kalau salah satu langkah gagal, semuanya rollback (Firestore transaction) — tidak
 * akan ada kondisi "pembayaran tersimpan tapi status tidak ikut ter-update".
 */
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

  await runTransaction(db, async (tx) => {
    const debtRef = doc(db, 'debts', input.debtId);
    const debtSnap = await tx.get(debtRef);
    if (!debtSnap.exists()) throw new Error('Hutang tidak ditemukan');
    const debt = debtSnap.data() as Debt;

    // Transaksi Firestore butuh semua read sebelum write; ambil payment yang sudah ada dulu.
    const existingPayments = await getPaymentsForDebt(input.debtId);
    const allPayments = [...existingPayments, payment];
    const status = computeDebtStatus(debt, allPayments);

    tx.set(doc(db, 'payments', payment.id), payment);
    tx.update(debtRef, { status, updatedAt: nowISO() });
  });

  return payment;
}

/**
 * Lunasi sekaligus (satu klik) semua hutang aktif/sebagian antara dua orang, dua arah.
 * Otomatis mencatat pembayaran sebesar sisa hutang masing-masing transaksi.
 */
export async function settleAllBetween(personAId: string, personBId: string): Promise<void> {
  const debtsCol = collection(db, 'debts');
  const [ab, ba] = await Promise.all([
    getDocs(query(debtsCol, where('debtorId', '==', personAId), where('creditorId', '==', personBId))),
    getDocs(query(debtsCol, where('debtorId', '==', personBId), where('creditorId', '==', personAId))),
  ]);
  const related = [...ab.docs, ...ba.docs]
    .map((d) => d.data() as Debt)
    .filter((d) => d.status === 'ACTIVE' || d.status === 'PARTIAL');

  for (const debt of related) {
    const payments = await getPaymentsForDebt(debt.id);
    const paidSoFar = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, debt.amount - paidSoFar);
    if (remaining <= 0) continue;
    const payment: Payment = {
      id: genId(),
      debtId: debt.id,
      amount: remaining,
      paymentDate: nowISO(),
      notes: 'Lunas otomatis',
      createdAt: nowISO(),
    };
    await setDoc(doc(db, 'payments', payment.id), payment);
    await updateDoc(doc(db, 'debts', debt.id), { status: 'PAID', updatedAt: nowISO() });
  }
}

/** Hapus SEMUA hutang beserta seluruh riwayat pembayarannya. Data orang tidak ikut terhapus. */
export async function deleteAllDebts(): Promise<void> {
  const [debtsSnap, paymentsSnap] = await Promise.all([
    getDocs(collection(db, 'debts')),
    getDocs(collection(db, 'payments')),
  ]);
  await Promise.all([
    ...debtsSnap.docs.map((d) => deleteDoc(d.ref)),
    ...paymentsSnap.docs.map((p) => deleteDoc(p.ref)),
  ]);
}
