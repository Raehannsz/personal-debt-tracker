import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDebts, usePayments, usePersons, useSettings } from '../hooks/useData';
import { getNetPairs } from '../services/debtLogic';
import { buildEntries, countEntries, entryTitle } from '../services/debtGroups';
import { formatCurrency, formatDate, formatTime } from '../utils/format';
import { getDueInfo } from '../utils/due';
import { Card, Badge, Button, Input, Select, EmptyState } from '../components/ui';
import { statusColor, statusLabel } from '../components/debtStatus';
import { DebtFormModal } from '../components/DebtFormModal';
import type { Debt, Payment } from '../types';
import { usePageLoading } from '../hooks/usePageLoading';
import { DebtsSkeleton } from '../components/Skeleton';

type FilterKey = 'ALL' | 'MY_DEBT' | 'MY_RECEIVABLE' | 'UNPAID' | 'DUE' | 'PAID';
type SortField = 'newest' | 'oldest' | 'amount';
type SortDir = 'asc' | 'desc';
type ViewMode = 'list' | 'grid';

const ITEMS_PER_PAGE = 10;
const VIEW_MODE_KEY = 'debts-view-mode';
const GROUPED_KEY = 'debts-grouped';

// Baca pilihan tampilan terakhir dari localStorage (default: list)
function getInitialViewMode(): ViewMode {
  try {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    if (saved === 'list' || saved === 'grid') return saved;
  } catch {
    // localStorage tidak tersedia (mis. mode privat) — abaikan
  }
  return 'list';
}

// Default: transaksi bersama dikelompokkan
function getInitialGrouped(): boolean {
  try {
    return localStorage.getItem(GROUPED_KEY) !== '0';
  } catch {
    return true;
  }
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'Semua' },
  { key: 'MY_DEBT', label: 'Hutang saya' },
  { key: 'MY_RECEIVABLE', label: 'Piutang saya' },
  { key: 'UNPAID', label: 'Belum lunas' },
  { key: 'DUE', label: 'Jatuh tempo' },
  { key: 'PAID', label: 'Lunas' },
];

const SORT_FIELDS: { key: SortField; label: string }[] = [
  { key: 'newest', label: 'Terbaru' },
  { key: 'oldest', label: 'Terlama' },
  { key: 'amount', label: 'Nominal' },
];

const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function getDayName(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return DAYS_ID[d.getDay()];
}

function matchesFilter(d: Debt, key: FilterKey, me: string | null): boolean {
  switch (key) {
    case 'ALL':
      return true;
    case 'MY_DEBT':
      return !!me && d.debtorId === me;
    case 'MY_RECEIVABLE':
      return !!me && d.creditorId === me;
    case 'UNPAID':
      return d.status === 'ACTIVE' || d.status === 'PARTIAL';
    case 'DUE': {
      if (d.status === 'PAID') return false;
      const info = getDueInfo(d.dueDate);
      return !!info && info.color !== 'slate';
    }
    case 'PAID':
      return d.status === 'PAID';
  }
}

// Catatan pembayaran terbaru dari salah satu hutang di entry ini
function getLatestNote(debtIds: string[], payments: Payment[]): string | undefined {
  const ids = new Set(debtIds);
  return payments
    .filter((p) => ids.has(p.debtId) && p.notes)
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0]?.notes;
}

export function Debts() {
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [personFilter, setPersonFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [sortField, setSortField] = useState<SortField>('newest');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);
  const [grouped, setGrouped] = useState<boolean>(getInitialGrouped);

  const debts = useDebts();
  const payments = usePayments();
  const persons = usePersons();
  const settings = useSettings();
  const me = settings.myPersonId;
  const loading = usePageLoading(['persons', 'debts', 'payments', 'settings']);

  useEffect(() => {
    setPage(1);
  }, [filter, personFilter, search, sortField, sortDir, grouped]);

  // Simpan pilihan tampilan setiap kali berubah
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      // abaikan
    }
  }, [viewMode]);

  useEffect(() => {
    try {
      localStorage.setItem(GROUPED_KEY, grouped ? '1' : '0');
    } catch {
      // abaikan
    }
  }, [grouped]);

  // Kalau "Saya" belum dipilih, chip Hutang saya / Piutang saya tidak ada gunanya
  const visibleFilters = useMemo(
    () => (me ? FILTERS : FILTERS.filter((f) => f.key !== 'MY_DEBT' && f.key !== 'MY_RECEIVABLE')),
    [me]
  );

  useEffect(() => {
    if (!me && (filter === 'MY_DEBT' || filter === 'MY_RECEIVABLE')) setFilter('ALL');
  }, [me, filter]);

  const nameById = useMemo(() => new Map(persons.map((p) => [p.id, p.name])), [persons]);
  const personName = (id: string) => nameById.get(id) ?? '—';

  const debtorOptions = useMemo(() => {
    const activeDebtorIds = new Set(
      debts.filter((d) => d.status === 'ACTIVE').map((d) => d.debtorId)
    );
    return persons.filter((p) => activeDebtorIds.has(p.id));
  }, [debts, persons]);

  // Jumlah transaksi per filter (ditampilkan di chip). Transaksi bersama dihitung 1 kalau dikelompokkan.
  const counts = useMemo(() => {
    const live = debts.filter((d) => d.status !== 'CANCELLED');
    const result = {} as Record<FilterKey, number>;
    for (const f of FILTERS) {
      result[f.key] = countEntries(
        live.filter((d) => matchesFilter(d, f.key, me)),
        grouped
      );
    }
    return result;
  }, [debts, me, grouped]);

  // Baris hutang yang lolos filter & pencarian
  const filtered = useMemo(() => {
    let list = debts.filter((d) => d.status !== 'CANCELLED' && matchesFilter(d, filter, me));
    if (personFilter) {
      list = list.filter((d) => d.debtorId === personFilter && d.status === 'ACTIVE');
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (d) =>
          (nameById.get(d.debtorId) ?? '').toLowerCase().includes(q) ||
          (nameById.get(d.creditorId) ?? '').toLowerCase().includes(q) ||
          (d.description ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [debts, filter, personFilter, search, me, nameById]);

  // Gabungkan jadi entry (transaksi bersama = 1 kartu), lalu urutkan
  const entries = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return buildEntries(filtered, payments, grouped).sort((a, b) => {
      if (sortField === 'amount') return (a.remaining - b.remaining) * dir;
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
    });
  }, [filtered, payments, grouped, sortField, sortDir]);

  // Total sisa dari transaksi yang sedang ditampilkan
  const remainingTotal = useMemo(() => entries.reduce((sum, e) => sum + e.remaining, 0), [entries]);

  const totalPages = Math.max(1, Math.ceil(entries.length / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return entries.slice(start, start + ITEMS_PER_PAGE);
  }, [entries, page]);

  const netPairs = useMemo(() => getNetPairs(debts, payments), [debts, payments]);

  const hasActiveFilter = filter !== 'ALL' || personFilter !== '' || search.trim() !== '';

  function resetFilters() {
    setFilter('ALL');
    setPersonFilter('');
    setSearch('');
  }

  function goToPage(next: number) {
    setPage(Math.min(totalPages, Math.max(1, next)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (loading) return <DebtsSkeleton />;

  const rangeStart = entries.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
  const rangeEnd = Math.min(page * ITEMS_PER_PAGE, entries.length);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Hutang</h2>
        <Button onClick={() => setShowForm(true)}>+ Tambah Hutang</Button>
      </div>

      {netPairs.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Ringkasan Net
          </h3>
          <div className="space-y-2">
            {netPairs.map((pair, i) => (
              <Card key={i} className="p-3.5 bg-indigo-50/50 border-indigo-100">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800">
                    {pair.settled ? (
                      <>
                        {personName(pair.fromId)} ↔ {personName(pair.toId)}
                      </>
                    ) : (
                      <>
                        {personName(pair.fromId)} → {personName(pair.toId)}
                      </>
                    )}
                  </p>
                  {pair.settled ? (
                    <Badge color="slate">Saling menutup</Badge>
                  ) : (
                    <p className="text-sm font-semibold text-indigo-700">
                      {formatCurrency(pair.amount)}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {persons.length > 0 && (
        <>
          <Input
            placeholder="Cari nama atau keterangan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div>
            <Select value={personFilter} onChange={(e) => setPersonFilter(e.target.value)}>
              <option value="">Semua Orang</option>
              {debtorOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            {personFilter && (
              <p className="text-[11px] text-slate-400 mt-1">
                Menampilkan hutang aktif {personName(personFilter)} saja (piutangnya, kalau ada,
                tidak ikut ditampilkan).
              </p>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {visibleFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border transition ${
                  filter === f.key
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 ${filter === f.key ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {counts[f.key]}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 shrink-0">Urutkan:</span>
            {/* Area sort: boleh di-scroll horizontal, tapi harus min-w-0 supaya tidak mendorong toggle keluar layar */}
            <div className="flex flex-1 min-w-0 gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {SORT_FIELDS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setSortField(f.key);
                    if (f.key === 'newest') setSortDir('desc');
                    if (f.key === 'oldest') setSortDir('asc');
                  }}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border transition ${
                    sortField === f.key
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <button
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="shrink-0 flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-medium border bg-white border-slate-200 text-slate-600"
                title={sortDir === 'asc' ? 'Ascending (kecil → besar)' : 'Descending (besar → kecil)'}
              >
                {sortDir === 'asc' ? '↑ Naik' : '↓ Turun'}
              </button>
            </div>
            {/* Toggle List/Grid: di luar area scroll, selalu terlihat */}
            <div className="flex shrink-0 rounded-lg border border-slate-200 bg-white overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1.5 text-xs font-medium transition ${
                  viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
                title="Tampilan List"
                aria-label="Tampilan List"
              >
                ☰<span className="hidden sm:inline"> List</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1.5 text-xs font-medium transition border-l border-slate-200 ${
                  viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
                title="Tampilan Grid"
                aria-label="Tampilan Grid"
              >
                ⊞<span className="hidden sm:inline"> Grid</span>
              </button>
            </div>
          </div>

          {/* Ringkasan hasil + kelompokkan + reset filter */}
          {counts.ALL > 0 && (
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <p>
                {entries.length} transaksi
                {remainingTotal > 0 && (
                  <>
                    {' · '}sisa{' '}
                    <span className="font-semibold text-slate-700">{formatCurrency(remainingTotal)}</span>
                  </>
                )}
              </p>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setGrouped((g) => !g)}
                  aria-pressed={grouped}
                  title="Gabungkan hutang yang dibuat dalam satu transaksi bersama menjadi satu kartu"
                  className={`rounded-full px-2.5 py-1 font-medium border transition ${
                    grouped
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  👥 Kelompokkan
                </button>
                {hasActiveFilter && (
                  <button onClick={resetFilters} className="font-medium text-indigo-600 hover:underline">
                    Reset filter
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {persons.length === 0 ? (
        <EmptyState
          title="Belum ada orang"
          description="Tambahkan orang untuk mulai mencatat hutang."
          action={
            <Link to="/orang">
              <Button>+ Tambah Orang</Button>
            </Link>
          }
        />
      ) : counts.ALL === 0 ? (
        <EmptyState
          title="Belum ada transaksi"
          description="Mulai catat hutang atau piutang pertama kamu."
          action={<Button onClick={() => setShowForm(true)}>+ Tambah Hutang</Button>}
        />
      ) : entries.length === 0 ? (
        <EmptyState
          title="Tidak ada hasil"
          description="Tidak ada transaksi yang cocok dengan pencarian atau filter ini."
          action={
            <Button variant="secondary" onClick={resetFilters}>
              Reset filter
            </Button>
          }
        />
      ) : (
        <>
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
            {paginatedData.map((e) => {
              const isPaid = e.status === 'PAID';
              const note = getLatestNote(
                e.debts.map((d) => d.id),
                payments
              );
              const dueInfo = !isPaid ? getDueInfo(e.dueDate) : null;
              // Hanya tandai yang terlambat / segera jatuh tempo, supaya daftar tidak ramai
              const urgentDue = dueInfo && dueInfo.color !== 'slate' ? dueInfo : null;
              const title = entryTitle(e, personName);
              return (
                <Link key={e.key} to={`/hutang/${e.linkId}`} className="block h-full">
                  <Card className={`hover:border-indigo-200 transition ${viewMode === 'grid' ? 'p-3 h-full' : 'p-3.5'}`}>
                    <div className="flex items-center justify-between gap-1">
                      <p className={`font-medium text-slate-800 truncate ${viewMode === 'grid' ? 'text-xs' : 'text-sm'}`}>
                        {title}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {urgentDue && viewMode === 'list' && (
                          <Badge color={urgentDue.color}>{urgentDue.text}</Badge>
                        )}
                        {e.isGroup && (
                          <Badge color="slate" className={viewMode === 'grid' ? '!text-[10px] !px-1.5 !py-0.5 shrink-0' : ''}>
                            👥 {e.debts.length}
                          </Badge>
                        )}
                        <Badge color={statusColor(e.status)} className={viewMode === 'grid' ? '!text-[10px] !px-1.5 !py-0.5 shrink-0' : ''}>
                          {statusLabel(e.status)}
                        </Badge>
                      </div>
                    </div>

                    {viewMode === 'list' ? (
                      <div className="flex items-start justify-between mt-1.5 gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-slate-500">
                            {getDayName(e.transactionDate)}, {formatDate(e.transactionDate, true)} ·{' '}
                            {formatTime(e.createdAt)}
                            {e.description && (
                              <>
                                <span className="text-slate-300"> · </span>
                                <span className="text-slate-500 truncate">{e.description}</span>
                              </>
                            )}
                            {note && (
                              <>
                                <span className="text-slate-300"> · </span>
                                <span className="text-slate-400 italic truncate">"{note}"</span>
                              </>
                            )}
                          </p>
                          {e.isGroup && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {e.debts.length} orang · {e.paidCount} lunas
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-semibold ${isPaid ? 'text-slate-400' : 'text-slate-800'}`}>
                            {formatCurrency(e.amount)}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {isPaid ? 'Lunas' : e.remaining !== e.amount ? `sisa ${formatCurrency(e.remaining)}` : '\u00A0'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mt-1.5">
                          <p className="text-[11px] text-slate-500 leading-tight">
                            {getDayName(e.transactionDate)}, {formatDate(e.transactionDate, true)} ·{' '}
                            {formatTime(e.createdAt)}
                          </p>
                          {e.description && (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{e.description}</p>
                          )}
                          {e.isGroup && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {e.debts.length} orang · {e.paidCount} lunas
                            </p>
                          )}
                          {urgentDue && (
                            <p
                              className={`text-[11px] font-medium mt-0.5 ${
                                urgentDue.color === 'red' ? 'text-red-600' : 'text-orange-700'
                              }`}
                            >
                              {urgentDue.text}
                            </p>
                          )}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <p className={`text-sm font-semibold ${isPaid ? 'text-slate-400' : 'text-slate-800'}`}>
                            {formatCurrency(e.amount)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {isPaid ? 'Lunas' : e.remaining !== e.amount ? `sisa ${formatCurrency(e.remaining)}` : '\u00A0'}
                          </p>
                        </div>
                        {note && (
                          <p className="text-[10px] text-slate-400 mt-1 italic truncate">"{note}"</p>
                        )}
                      </>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
            <p className="text-xs text-slate-500">
              Menampilkan {rangeStart}–{rangeEnd} dari {entries.length} transaksi
              {totalPages > 1 && ` · Halaman ${page}/${totalPages}`}
            </p>
            {totalPages > 1 && (
              <div className="flex gap-1">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                >
                  ← Sebelumnya
                </button>
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                >
                  Selanjutnya →
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <DebtFormModal open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}