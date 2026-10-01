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

/**
 * Format tanggal dengan memaksa zona waktu Asia/Jakarta (WIB)
 * agar tanggal tidak bergeser karena timezone perangkat/server.
 */
export function formatDate(iso: string | null | undefined, short = false): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';

  // Ekstrak bagian tanggal menggunakan zona waktu WIB
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).formatToParts(d);

  const year = parts.find((p) => p.type === 'year')?.value;
  const monthIndex = parseInt(parts.find((p) => p.type === 'month')?.value || '1', 10) - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')?.value || '1', 10);

  const months = short ? MONTHS_ID_SHORT : MONTHS_ID;
  return `${day} ${months[monthIndex]} ${year}`;
}

/** Jam pencatatan dalam zona waktu Jakarta (GMT+7 / WIB), terlepas dari timezone perangkat. */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const time = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  }).format(d);
  return `${time} WIB`;
}

/**
 * Mengubah ISO string menjadi format YYYY-MM-DD untuk <input type="date">
 * Menggunakan zona waktu WIB agar tanggal di input tidak mundur/mandur.
 */
export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).formatToParts(d);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

/**
 * Mengubah nilai input date (YYYY-MM-DD) menjadi ISO string.
 * Menambahkan 'Z' agar dianggap UTC Midnight, mencegah pergeseran tanggal saat disimpan.
 */
export function fromDateInputValue(value: string): string {
  if (!value) return new Date().toISOString();
  // Tambahkan 'Z' di akhir agar JavaScript membacanya sebagai UTC, bukan waktu lokal
  return new Date(value + 'T00:00:00Z').toISOString();
}

export function isOverdue(dueDate: string | null | undefined, status: string): boolean {
  if (!dueDate || status === 'PAID' || status === 'CANCELLED') return false;
  
  // Bandingkan dengan hari ini dalam zona waktu WIB
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  today.setHours(0, 0, 0, 0);
  
  return new Date(dueDate).getTime() < today.getTime();
}