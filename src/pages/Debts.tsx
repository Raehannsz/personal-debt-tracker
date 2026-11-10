import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDebts, usePayments, usePersons, useSettings } from '../hooks/useData';
import { getRemainingDebt, getNetPairs } from '../services/debtLogic';
import { formatCurrency, formatDate, formatTime } from '../utils/format';
import { Card, Badge, Button, Input, Select, EmptyState } from '../components/ui';
import { statusColor, statusLabel } from '../components/debtStatus';
import { DebtFormModal } from '../components/DebtFormModal';
import type { Payment } from '../types';
import { usePageLoading } from '../hooks/usePageLoading';
import { DebtsSkeleton } from '../components/Skeleton';

type FilterKey = 'ALL' | 'MY_DEBT' | 'MY_RECEIVABLE' | 'UNPAID' | 'PAID';
type SortField = 'newest' | 'oldest' | 'amount';
type SortDir = 'asc' | 'desc';
type ViewMode = 'list' | 'grid';

const ITEMS_PER_PAGE = 10;
const VIEW_MODE_KEY = 'debts-view-mode';

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

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'Semua' },
  { key: 'MY_DEBT', label: 'Hutang saya' },
  { key: 'MY_RECEIVABLE', label: 'Piutang saya' },
  { key: 'UNPAID', label: 'Belum lunas' },
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

function getLatestNote(debtId: string, payments: Payment[]): string | undefined {
  return payments
    .filter((p) => p.debtId === debtId && p.notes)
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0]?.notes;
}

export function Debts() {
  // ✅ SEMUA HOOKS DI DALAM KOMPONEN
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [personFilter, setPersonFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [sortField, setSortField] = useState<SortField>('newest');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);

  const debts = useDebts();
  const payments = usePayments();
  const persons = usePersons();
  const settings = useSettings();
  const loading = usePageLoading(['persons', 'debts', 'payments', 'settings']);

  useEffect(() => {
    setPage(1);
  }, [filter, personFilter, search, sortField, sortDir]);

  // Simpan pilihan tampilan setiap kali berubah
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      // abaikan
    }
  }, [viewMode]);

  const personName = (id: string) => persons.find((p) => p.id === id)?.name ?? '—';

  const debtorOptions = useMemo(() => {
    const activeDebtorIds = new Set(
      debts.filter((d) => d.status === 'ACTIVE').map((d) => d.debtorId)
    );
    return persons.filter((p) => activeDebtorIds.has(p.id));
  }, [debts, persons]);

  const filtered = useMemo(() => {
    let list = debts.filter((d) => d.status !== 'CANCELLED');
    const me = settings.myPersonId;
    if (filter === 'MY_DEBT' && me) list = list.filter((d) => d.debtorId === me);
    if (filter === 'MY_RECEIVABLE' && me) list = list.filter((d) => d.creditorId === me);
    if (filter === 'UNPAID') list = list.filter((d) => d.status === 'ACTIVE' || d.status === 'PARTIAL');
    if (filter === 'PAID') list = list.filter((d) => d.status === 'PAID');
    if (personFilter) {
      list = list.filter((d) => d.debtorId === personFilter && d.status === 'ACTIVE');
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (d) =>
          personName(d.debtorId).toLowerCase().includes(q) ||
          personName(d.creditorId).toLowerCase().includes(q)
      );
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      if (sortField === 'amount') {
        return (getRemainingDebt(a, payments) - getRemainingDebt(b, payments)) * dir;
      }
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return (timeA - timeB) * dir;
    });
    return list;
  }, [debts, filter, personFilter, search, settings.myPersonId, persons, sortField, sortDir, payments, personName]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, page]);

  const netPairs = useMemo(() => getNetPairs(debts, payments), [debts, payments]);

  if (loading) return <DebtsSkeleton />;

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
          <Input placeholder="Cari nama..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
            {FILTERS.map((f) => (
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
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Belum ada transaksi"
          description="Mulai catat hutang atau piutang pertama kamu."
          action={<Button onClick={() => setShowForm(true)}>+ Tambah Hutang</Button>}
        />
      ) : (
        <>
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
            {paginatedData.map((d) => {
              const remaining = getRemainingDebt(d, payments);
              const isPaid = d.status === 'PAID';
              const note = getLatestNote(d.id, payments);
              return (
                <Link key={d.id} to={`/hutang/${d.id}`}>
                  <Card className={`hover:border-indigo-200 transition ${viewMode === 'grid' ? 'p-3 h-full' : 'p-3.5'}`}>
                    <div className="flex items-center justify-between gap-1">
                      <p className={`font-medium text-slate-800 truncate ${viewMode === 'grid' ? 'text-xs' : 'text-sm'}`}>
                        {personName(d.debtorId)} → {personName(d.creditorId)}
                      </p>
                      <Badge color={statusColor(d.status)} className={viewMode === 'grid' ? '!text-[10px] !px-1.5 !py-0.5 shrink-0' : ''}>
                        {statusLabel(d.status)}
                      </Badge>
                    </div>

                    {viewMode === 'list' ? (
                      <div className="flex items-start justify-between mt-1.5 gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-slate-500">
                            {getDayName(d.transactionDate)}, {formatDate(d.transactionDate, true)} ·{' '}
                            {formatTime(d.createdAt)}
                            {d.description && (
                              <>
                                <span className="text-slate-300"> · </span>
                                <span className="text-slate-500 truncate">{d.description}</span>
                              </>
                            )}
                            {note && (
                              <>
                                <span className="text-slate-300"> · </span>
                                <span className="text-slate-400 italic truncate">"{note}"</span>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-semibold ${isPaid ? 'text-slate-400' : 'text-slate-800'}`}>
                            {formatCurrency(d.amount)}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {isPaid ? 'Lunas' : remaining !== d.amount ? `sisa ${formatCurrency(remaining)}` : '\u00A0'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mt-1.5">
                          <p className="text-[11px] text-slate-500 leading-tight">
                            {getDayName(d.transactionDate)}, {formatDate(d.transactionDate, true)} ·{' '}
                            {formatTime(d.createdAt)}
                          </p>
                          {d.description && (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{d.description}</p>
                          )}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <p className={`text-sm font-semibold ${isPaid ? 'text-slate-400' : 'text-slate-800'}`}>
                            {formatCurrency(d.amount)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {isPaid ? 'Lunas' : remaining !== d.amount ? `sisa ${formatCurrency(remaining)}` : '\u00A0'}
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

          {/* Toggle View Mode + Pagination */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
              <p className="text-xs text-slate-500">
                Halaman {page} dari {totalPages} ({filtered.length} transaksi)
              </p>
              <div className="flex items-center gap-2">
                {filtered.length > ITEMS_PER_PAGE && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                    >
                      ← Sebelumnya
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                    >
                      Selanjutnya →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <DebtFormModal open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}