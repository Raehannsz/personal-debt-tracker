import Dexie, { type Table } from 'dexie';
import type { Person, Debt, Payment, Settings } from '../types';

export class DebtTrackerDB extends Dexie {
  persons!: Table<Person, string>;
  debts!: Table<Debt, string>;
  payments!: Table<Payment, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('personal-debt-tracker');
    this.version(1).stores({
      persons: 'id, name, deletedAt',
      debts: 'id, debtorId, creditorId, status, dueDate',
      payments: 'id, debtId, paymentDate',
      settings: 'id',
    });
  }
}

export const db = new DebtTrackerDB();

export function genId(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}
