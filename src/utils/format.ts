export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount);
  return 'Rp' + rounded.toLocaleString('id-ID');
}

export function parseCurrencyInput(value: string): number {
  const digits = value.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const MONTHS_ID_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export function formatDate(iso: string | null | undefined, short = false): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const months = short ? MONTHS_ID_SHORT : MONTHS_ID;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function fromDateInputValue(value: string): string {
  if (!value) return new Date().toISOString();
  return new Date(value + 'T00:00:00').toISOString();
}

export function isOverdue(dueDate: string | null | undefined, status: string): boolean {
  if (!dueDate || status === 'PAID' || status === 'CANCELLED') return false;
  return new Date(dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
}
