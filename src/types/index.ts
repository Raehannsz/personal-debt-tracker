export interface Person {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  isMe?: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DebtStatus = 'ACTIVE' | 'PARTIAL' | 'PAID' | 'CANCELLED';

export interface Debt {
  id: string;
  debtorId: string;
  creditorId: string;
  amount: number;
  description?: string;
  transactionDate: string;
  dueDate?: string | null;
  status: DebtStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  debtId: string;
  amount: number;
  paymentDate: string;
  notes?: string;
  createdAt: string;
}

export interface Settings {
  id: 'settings';
  myPersonId: string | null;
  theme: 'light' | 'dark' | 'system';
}

export interface BackupData {
  version: number;
  exportedAt: string;
  persons: Person[];
  debts: Debt[];
  payments: Payment[];
  settings: Settings;
}
