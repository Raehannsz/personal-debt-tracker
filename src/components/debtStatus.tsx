import type { DebtStatus } from '../types';

export function statusLabel(status: DebtStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Aktif';
    case 'PARTIAL':
      return 'Sebagian';
    case 'PAID':
      return 'Lunas';
    case 'CANCELLED':
      return 'Dibatalkan';
  }
}

export function statusColor(status: DebtStatus): 'green' | 'orange' | 'red' | 'slate' {
  switch (status) {
    case 'PAID':
      return 'slate';
    case 'PARTIAL':
      return 'orange';
    case 'ACTIVE':
      return 'red';
    case 'CANCELLED':
      return 'slate';
  }
}
