import type { Debt, DebtStatus, Payment } from '../types';
import { getRemainingDebt } from './debtLogic';

/**
 * "Entry" = satu baris tampilan. Bisa satu hutang biasa, atau gabungan beberapa hutang
 * yang dibuat dalam satu transaksi bersama (groupId sama + pemberi hutang sama).
 */
export interface DebtEntry {
  key: string;
  /** id hutang yang dibuka saat kartu diklik (anggota pertama kalau grup) */
  linkId: string;
  isGroup: boolean;
  debts: Debt[];
  creditorId: string;
  amount: number;
  remaining: number;
  paidCount: number;
  status: DebtStatus;
  transactionDate: string;
  createdAt: string;
  description?: string;
  /** jatuh tempo paling awal dari anggota yang belum lunas */
  dueDate: string | null;
}

export function entryKey(debt: Debt, grouped: boolean): string {
  return grouped && debt.groupId ? `g:${debt.groupId}|${debt.creditorId}` : `s:${debt.id}`;
}

export function countEntries(debts: Debt[], grouped: boolean): number {
  return new Set(debts.map((d) => entryKey(d, grouped))).size;
}

/** Urutan entry mengikuti kemunculan pertama di daftar `debts`. Kirim hutang non-CANCELLED. */
export function buildEntries(debts: Debt[], payments: Payment[], grouped = true): DebtEntry[] {
  const order: string[] = [];
  const buckets = new Map<string, Debt[]>();

  for (const d of debts) {
    const key = entryKey(d, grouped);
    let list = buckets.get(key);
    if (!list) {
      list = [];
      buckets.set(key, list);
      order.push(key);
    }
    list.push(d);
  }

  return order.map((key) => {
    const members = buckets.get(key)!;
    const first = members[0];
    const isGroup = members.length > 1;
    const amount = members.reduce((sum, d) => sum + d.amount, 0);
    const remaining = members.reduce((sum, d) => sum + getRemainingDebt(d, payments), 0);
    const paidCount = members.filter((d) => d.status === 'PAID' || getRemainingDebt(d, payments) <= 0).length;

    let status: DebtStatus;
    if (!isGroup) status = first.status;
    else if (remaining <= 0) status = 'PAID';
    else status = remaining < amount ? 'PARTIAL' : 'ACTIVE';

    const dueDates = members
      .filter((d) => d.status !== 'PAID' && d.dueDate)
      .map((d) => d.dueDate as string)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const dueDate = isGroup ? dueDates[0] ?? null : first.dueDate ?? null;

    return {
      key,
      linkId: first.id,
      isGroup,
      debts: members,
      creditorId: first.creditorId,
      amount,
      remaining,
      paidCount,
      status,
      transactionDate: first.transactionDate,
      createdAt: first.createdAt,
      description: first.description,
      dueDate,
    };
  });
}

/** "A, B +2 → C" */
export function entryTitle(entry: DebtEntry, nameOf: (id: string) => string, maxNames = 2): string {
  const names = entry.debts.map((d) => nameOf(d.debtorId));
  const shown = names.slice(0, maxNames).join(', ');
  const extra = names.length > maxNames ? ` +${names.length - maxNames}` : '';
  return `${shown}${extra} → ${nameOf(entry.creditorId)}`;
}