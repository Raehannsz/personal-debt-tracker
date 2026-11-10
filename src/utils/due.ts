// Helper jatuh tempo — dipakai oleh halaman Hutang dan Detail Hutang.

export type DueInfo = { text: string; color: 'red' | 'orange' | 'slate' };

// Hitung selisih hari ke jatuh tempo (tanggal saja, tanpa jam).
export function getDueInfo(dueDate: string | null | undefined): DueInfo | null {
  if (!dueDate) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate);
  const due = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(dueDate);
  if (isNaN(due.getTime())) return null;
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0) return { text: `Terlambat ${-diff} hari`, color: 'red' };
  if (diff === 0) return { text: 'Jatuh tempo hari ini', color: 'orange' };
  if (diff <= 3) return { text: `${diff} hari lagi`, color: 'orange' };
  return { text: `${diff} hari lagi`, color: 'slate' };
}