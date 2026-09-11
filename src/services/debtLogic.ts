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

export function getActiveDebtsCount(debts: Debt[]): number {
  return debts.filter((d) => d.status === 'ACTIVE' || d.status === 'PARTIAL').length;
}

export function getNearestDueDate(debts: Debt[]): Debt | null {
  const upcoming = debts
    .filter((d) => d.dueDate && (d.status === 'ACTIVE' || d.status === 'PARTIAL'))
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  return upcoming[0] ?? null;
}
