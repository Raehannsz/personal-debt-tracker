import { useEffect, useState } from 'react';
import { useDataReady, type DataKey } from './useData';

const ALL_KEYS: DataKey[] = ['persons', 'debts', 'payments', 'settings'];

/**
 * Mengembalikan true selama skeleton harus tampil.
 *
 * Skeleton tampil di SETIAP kunjungan halaman, dan baru hilang kalau:
 *  1) data yang dibutuhkan sudah termuat dari Supabase, DAN
 *  2) durasi minimum `minMs` sudah lewat (supaya efeknya terlihat & tidak berkedip).
 *
 * Kalau data lambat, skeleton menunggu sampai data benar-benar masuk.
 * Ubah `minMs` untuk memperpanjang/memperpendek efek (0 = tanpa jeda minimum).
 */
export function usePageLoading(keys: DataKey[] = ALL_KEYS, minMs = 400): boolean {
  const ready = useDataReady(keys);
  const [minPassed, setMinPassed] = useState(minMs <= 0);

  useEffect(() => {
    if (minMs <= 0) return;
    const t = setTimeout(() => setMinPassed(true), minMs);
    return () => clearTimeout(t);
  }, [minMs]);

  return !(ready && minPassed);
}