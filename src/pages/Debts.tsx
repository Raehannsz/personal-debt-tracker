import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDebts, usePayments, usePersons, useSettings } from '../hooks/useData';
import { getRemainingDebt } from '../services/debtLogic';
import { formatCurrency, formatDate } from '../utils/format';
import { Card, Badge, Button, Input, EmptyState } from '../components/ui';
import { statusColor, statusLabel } from '../components/debtStatus';
import { DebtFormModal } from '../components/DebtFormModal';

type FilterKey = 'ALL' | 'MY_DEBT' | 'MY_RECEIVABLE' | 'UNPAID' | 'PAID';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'Semua' },
  { key: 'MY_DEBT', label: 'Hutang saya' },
  { key: 'MY_RECEIVABLE', label: 'Piutang saya' },
  { key: 'UNPAID', label: 'Belum lunas' },
  { key: 'PAID', label: 'Lunas' },
];

export function Debts() {
  const debts = useDebts();
  const payments = usePayments();
  const persons = usePersons();
  const settings = useSettings();
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

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
    return list;
  }, [debts, filter, search, settings.myPersonId, persons]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Hutang</h2>
        <Button onClick={() => setShowForm(true)}>+ Tambah Hutang</Button>
      </div>

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
                    <p className="text-xs text-slate-500">{formatDate(d.transactionDate, true)}</p>
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
