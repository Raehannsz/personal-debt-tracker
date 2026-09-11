import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDebts, usePayments, usePersons, useSettings } from '../hooks/useData';
import { getRemainingDebt, getNetPairs } from '../services/debtLogic';
import { formatCurrency, formatDate, formatTime } from '../utils/format';
import { Card, Badge, Button, Input, EmptyState } from '../components/ui';
import { statusColor, statusLabel } from '../components/debtStatus';
import { DebtFormModal } from '../components/DebtFormModal';

type FilterKey = 'ALL' | 'MY_DEBT' | 'MY_RECEIVABLE' | 'UNPAID' | 'PAID';
type SortField = 'date' | 'amount';
type SortDir = 'asc' | 'desc';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'Semua' },
  { key: 'MY_DEBT', label: 'Hutang saya' },
  { key: 'MY_RECEIVABLE', label: 'Piutang saya' },
  { key: 'UNPAID', label: 'Belum lunas' },
  { key: 'PAID', label: 'Lunas' },
];

const SORT_FIELDS: { key: SortField; label: string }[] = [
  { key: 'date', label: 'Tanggal' },
  { key: 'amount', label: 'Nominal' },
];

export function Debts() {
  const debts = useDebts();
  const payments = usePayments();
  const persons = usePersons();
  const settings = useSettings();
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const personName = (id: string) => persons.find((p) => p.id === id)?.name ?? '—';

  const filtered = useMemo(() => {
    let list = debts.filter((d) => d.status !== 'CANCELLED');
    const me = settings.myPersonId;

    if (filter === 'MY_DEBT' && me) list = list.filter((d) => d.debtorId === me);
    if (filter === 'MY_RECEIVABLE' && me) list = list.filter((d) => d.creditorId === me);
    if (filter === 'UNPAID') list = list.filter((d) => d.status === 'ACTIVE' || d.status === 'PARTIAL');
    if (filter === 'PAID') list = list.filter((d) => d.status === 'PAID');

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (d) => personName(d.debtorId).toLowerCase().includes(q) || personName(d.creditorId).toLowerCase().includes(q)
      );
    }

    const dir = sortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      if (sortField === 'amount') {
        return (getRemainingDebt(a, payments) - getRemainingDebt(b, payments)) * dir;
      }
      return (new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()) * dir;
    });

    return list;
  }, [debts, filter, search, settings.myPersonId, persons, sortField, sortDir, payments]);

  const netPairs = useMemo(() => getNetPairs(debts, payments), [debts, payments]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Hutang</h2>
        <Button onClick={() => setShowForm(true)}>+ Tambah Hutang</Button>
      </div>

      {netPairs.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Ringkasan Net</h3>
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
                    <p className="text-sm font-semibold text-indigo-700">{formatCurrency(pair.amount)}</p>
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
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {SORT_FIELDS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setSortField(f.key)}
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
                {sortDir === 'asc' ? '↑ Ascending' : '↓ Descending'}
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
        <div className="space-y-2">
          {filtered.map((d) => {
            const remaining = getRemainingDebt(d, payments);
            return (
              <Link key={d.id} to={`/hutang/${d.id}`}>
                <Card className="p-3.5 hover:border-indigo-200 transition">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800">
                      {personName(d.debtorId)} → {personName(d.creditorId)}
                    </p>
                    <Badge color={statusColor(d.status)}>{statusLabel(d.status)}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs text-slate-500">
                      {formatDate(d.transactionDate, true)} · {formatTime(d.createdAt)}
                    </p>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">{formatCurrency(remaining)}</p>
                      {remaining !== d.amount && remaining > 0 && (
                        <p className="text-[11px] text-slate-400">dari {formatCurrency(d.amount)}</p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <DebtFormModal open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}
