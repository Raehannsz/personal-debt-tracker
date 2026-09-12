import { Link } from 'react-router-dom';
import { useDebts, usePayments, usePersons, useSettings } from '../hooks/useData';
import {
  getNetTotals,
  getNetEdges,
  getActiveDebtsCount,
  getNearestDueDate,
} from '../services/debtLogic';
import { settleAllBetween } from '../services/debtRepo';
import { formatCurrency, formatDate } from '../utils/format';
import { Card, Button, EmptyState } from '../components/ui';
import { confirmDialog } from '../stores/confirmStore';
import { showToast } from '../stores/toastStore';

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
    .map((e) => ({ fromId: e.fromId, toId: e.toId, from: personName(e.fromId), to: personName(e.toId), amount: e.amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  async function handleSettle(fromId: string, toId: string, from: string, to: string, amount: number) {
    const ok = await confirmDialog({
      title: 'Tandai Lunas?',
      message: `Semua hutang antara ${from} dan ${to} (net ${formatCurrency(amount)}) akan langsung ditandai lunas. Pembayaran otomatis dicatat sesuai sisa hutang masing-masing transaksi.`,
      confirmLabel: 'Lunas',
    });
    if (!ok) return;
    await settleAllBetween(fromId, toId);
    showToast('✓ Hutang berhasil ditandai lunas');
  }

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
              <Card key={i} className="p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <Link to="/hutang" className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {e.from} → {e.to}
                    </p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{formatCurrency(e.amount)}</p>
                  </Link>
                  <Button
                    variant="secondary"
                    className="!px-3 !py-1.5 !text-xs shrink-0"
                    onClick={() => handleSettle(e.fromId, e.toId, e.from, e.to, e.amount)}
                  >
                    ✓ Lunas
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
