import { Link } from 'react-router-dom';
import { useDebts, usePayments, usePersons, useSettings } from '../hooks/useData';
import {
  getNetTotals,
  getNetEdges,
  getActiveDebtsCount,
  getNearestDueDate,
} from '../services/debtLogic';
import { formatCurrency, formatDate } from '../utils/format';
import { Card, Button, EmptyState } from '../components/ui';

export function Dashboard() {
  const debts = useDebts();
  const payments = usePayments();
  const persons = usePersons();
  const settings = useSettings();

  const me = settings.myPersonId;
  const { totalDebt, totalReceivable } = me
    ? getNetTotals(me, persons.map((p) => p.id), debts, payments)
    : { totalDebt: 0, totalReceivable: 0 };
  const activeCount = getActiveDebtsCount(debts);
  const nearestDue = getNearestDueDate(debts);
  const personName = (id: string) => persons.find((p) => p.id === id)?.name ?? '—';

  const netEdges = getNetEdges(debts, payments)
    .map((e) => ({ from: personName(e.fromId), to: personName(e.toId), amount: e.amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  if (persons.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          title="Belum ada transaksi"
          description="Mulai catat hutang atau piutang pertama kamu."
          action={
            <Link to="/orang">
              <Button>+ Tambah Orang</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Dashboard</h2>

      {!me && (
        <Card className="p-4 bg-indigo-50 border-indigo-100">
          <p className="text-sm text-indigo-800">
            Tentukan siapa "Saya" di halaman{' '}
            <Link to="/settings" className="underline font-medium">
              Settings
            </Link>{' '}
            agar ringkasan hutang/piutang lebih akurat.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1">Total Hutang</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalDebt)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1">Total Piutang</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalReceivable)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1">Hutang Aktif</p>
          <p className="text-xl font-bold text-slate-800">{activeCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1">Jatuh Tempo Terdekat</p>
          <p className="text-base font-bold text-slate-800">
            {nearestDue ? formatDate(nearestDue.dueDate, true) : '-'}
          </p>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-800 text-sm">Ringkasan Hutang (Net)</h3>
          <Link to="/hutang" className="text-xs text-indigo-600 font-medium">
            Lihat semua
          </Link>
        </div>
        {netEdges.length === 0 ? (
          <Card className="p-4">
            <EmptyState
              title="Belum ada transaksi"
              description="Mulai catat hutang atau piutang pertama kamu."
              action={
                <Link to="/hutang">
                  <Button>+ Tambah Hutang</Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {netEdges.map((e, i) => (
              <Link key={i} to="/hutang">
                <Card className="p-3.5 hover:border-indigo-200 transition">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800">
                      {e.from} → {e.to}
                    </p>
                    <p className="text-sm font-semibold text-slate-800">{formatCurrency(e.amount)}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
