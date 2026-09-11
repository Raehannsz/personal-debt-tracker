import type { Debt, Payment, DebtStatus } from '../types';

export function getTotalPaid(debtId: string, payments: Payment[]): number {
  return payments
    .filter((p) => p.debtId === debtId)
    .reduce((sum, p) => sum + p.amount, 0);
}

export function getRemainingDebt(debt: Debt, payments: Payment[]): number {
  if (debt.status === 'CANCELLED') return 0;
  const paid = getTotalPaid(debt.id, payments);
  return Math.max(0, debt.amount - paid);
}

export function computeDebtStatus(debt: Debt, payments: Payment[]): DebtStatus {
  if (debt.status === 'CANCELLED') return 'CANCELLED';
  const paid = getTotalPaid(debt.id, payments);
  if (paid <= 0) return 'ACTIVE';
  if (paid >= debt.amount) return 'PAID';
  return 'PARTIAL';
}

/** Total yang harus dibayar oleh `personId` (sebagai debtor) ke orang lain */
export function getTotalDebt(personId: string, debts: Debt[], payments: Payment[]): number {
  return debts
    .filter((d) => d.debtorId === personId && d.status !== 'CANCELLED')
    .reduce((sum, d) => sum + getRemainingDebt(d, payments), 0);
}

/** Total yang harus diterima oleh `personId` (sebagai creditor) dari orang lain */
export function getTotalReceivable(personId: string, debts: Debt[], payments: Payment[]): number {
  return debts
    .filter((d) => d.creditorId === personId && d.status !== 'CANCELLED')
    .reduce((sum, d) => sum + getRemainingDebt(d, payments), 0);
}

/** Posisi hutang antara `personId` dan `otherId` (dua arah) */
export function getPersonBalance(
  personId: string,
  otherId: string,
  debts: Debt[],
  payments: Payment[]
): { iOwe: number; owedToMe: number } {
  const iOwe = debts
    .filter((d) => d.debtorId === personId && d.creditorId === otherId && d.status !== 'CANCELLED')
    .reduce((sum, d) => sum + getRemainingDebt(d, payments), 0);
  const owedToMe = debts
    .filter((d) => d.debtorId === otherId && d.creditorId === personId && d.status !== 'CANCELLED')
    .reduce((sum, d) => sum + getRemainingDebt(d, payments), 0);
  return { iOwe, owedToMe };
}

/**
 * Kliring/netting hutang dua arah antara dua orang.
 * Contoh: A → B Rp10.000 dan B → A Rp5.000, maka net-nya A → B Rp5.000.
 */
export function getNetBalance(
  personId: string,
  otherId: string,
  debts: Debt[],
  payments: Payment[]
): { amount: number; direction: 'I_OWE' | 'OWED_TO_ME' | 'SETTLED' } {
  const { iOwe, owedToMe } = getPersonBalance(personId, otherId, debts, payments);
  const diff = iOwe - owedToMe;
  if (diff === 0) return { amount: 0, direction: 'SETTLED' };
  return diff > 0 ? { amount: diff, direction: 'I_OWE' } : { amount: -diff, direction: 'OWED_TO_ME' };
}

/**
 * Ringkasan net per pasangan orang di seluruh data hutang (bukan relatif ke "Saya").
 * Kalau A→B Rp10.000 dan B→A Rp5.000, hasilnya satu entri: A tetap berhutang Rp5.000 ke B.
 * Pasangan yang sudah saling menutup (net = 0) tidak dimasukkan.
 */
export function getNetPairs(
  debts: Debt[],
  payments: Payment[]
): { fromId: string; toId: string; amount: number; settled: boolean }[] {
  const map = new Map<string, { a: string; b: string; aToB: number; bToA: number }>();

  for (const debt of debts) {
    if (debt.status === 'CANCELLED') continue;
    const remaining = getRemainingDebt(debt, payments);
    if (remaining <= 0) continue;

    const [a, b] = [debt.debtorId, debt.creditorId].sort();
    const key = `${a}|${b}`;
    if (!map.has(key)) map.set(key, { a, b, aToB: 0, bToA: 0 });
    const entry = map.get(key)!;
    if (debt.debtorId === a) entry.aToB += remaining;
    else entry.bToA += remaining;
  }

  const result: { fromId: string; toId: string; amount: number; settled: boolean }[] = [];
  for (const { a, b, aToB, bToA } of map.values()) {
    // Hanya tampilkan pasangan yang benar-benar saling berhutang (dua arah);
    // kalau cuma satu arah, daftar transaksi mentah sudah cukup jelas.
    if (aToB === 0 || bToA === 0) continue;
    const diff = aToB - bToA;
    if (diff === 0) {
      result.push({ fromId: a, toId: b, amount: 0, settled: true });
    } else if (diff > 0) {
      result.push({ fromId: a, toId: b, amount: diff, settled: false });
    } else {
      result.push({ fromId: b, toId: a, amount: -diff, settled: false });
    }
  }
  return result;
}

export function getActiveDebtsCount(debts: Debt[]): number {
  return debts.filter((d) => d.status === 'ACTIVE' || d.status === 'PARTIAL').length;
}

export function getNearestDueDate(debts: Debt[]): Debt | null {
  const upcoming = debts
    .filter((d) => d.dueDate && (d.status === 'ACTIVE' || d.status === 'PARTIAL'))
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  return upcoming[0] ?? null;
}
