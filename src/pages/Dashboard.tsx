import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDebts, usePayments, usePersons, useSettings } from '../hooks/useData';
import { getNetTotals, getNetEdges, getNearestDueDate, getRemainingDebt } from '../services/debtLogic';
import { buildEntries, countEntries, entryTitle } from '../services/debtGroups';
import type { DebtEntry } from '../services/debtGroups';
import { settleAllBetween } from '../services/debtRepo';
import { formatCurrency, formatDate } from '../utils/format';
import { getDueInfo } from '../utils/due';
import { Card, Badge, Button, EmptyState } from '../components/ui';
import { confirmDialog } from '../stores/confirmStore';
import { showToast } from '../stores/toastStore';
import { usePageLoading } from '../hooks/usePageLoading';
import { DashboardSkeleton } from '../components/Skeleton';

type DueInfo = NonNullable<ReturnType<typeof getDueInfo>>;

export function Dashboard() {
  // Hooks harus tetap di paling atas (Rules of Hooks)
  const debts = useDebts();
  const payments = usePayments();
  const persons = usePersons();
  const settings = useSettings();
  const me = settings.myPersonId;

  // Loading mengikuti status data asli dari Supabase
  const loading = usePageLoading(['persons', 'debts', 'payments', 'settings']);

  // Kalkulasi berat tetap di-memoize agar performa optimal
  const personIds = useMemo(() => persons.map((p) => p.id), [persons]);
  const { totalDebt, totalReceivable } = useMemo(() => {
    if (!me) return { totalDebt: 0, totalReceivable: 0 };
    return getNetTotals(me, personIds, debts, payments);
  }, [me, personIds, debts, payments]);

  // Transaksi aktif: transaksi bersama dihitung 1
  const activeCount = useMemo(
    () => countEntries(debts.filter((d) => d.status === 'ACTIVE' || d.status === 'PARTIAL'), true),
    [debts]
  );
  const nearestDue = useMemo(() => getNearestDueDate(debts), [debts]);

  // Progres pelunasan keseluruhan
  const { totalAmount, totalRemaining } = useMemo(() => {
    const live = debts.filter((d) => d.status !== 'CANCELLED');
    return {
      totalAmount: live.reduce((sum, d) => sum + d.amount, 0),
      totalRemaining: live.reduce((sum, d) => sum + getRemainingDebt(d, payments), 0),
    };
  }, [debts, payments]);
  const paidPct =
    totalAmount > 0 ? Math.min(100, Math.round(((totalAmount - totalRemaining) / totalAmount) * 100)) : 0;

  const personName = useMemo(() => {
    const personMap = new Map(persons.map((p) => [p.id, p.name]));
    return (id: string) => personMap.get(id) ?? '—';
  }, [persons]);

  // Hutang yang terlambat / segera jatuh tempo (transaksi bersama digabung)
  const attention = useMemo(() => {
    const active = debts.filter((d) => (d.status === 'ACTIVE' || d.status === 'PARTIAL') && d.dueDate);
    const result: { entry: DebtEntry; info: DueInfo }[] = [];
    for (const entry of buildEntries(active, payments, true)) {
      const info = getDueInfo(entry.dueDate);
      if (!info || info.color === 'slate') continue;
      result.push({ entry, info });
    }
    return result
      .sort((a, b) => new Date(a.entry.dueDate ?? 0).getTime() - new Date(b.entry.dueDate ?? 0).getTime())
      .slice(0, 4);
  }, [debts, payments]);

  // Nama "Saya" ditampilkan sebagai "Saya" supaya mudah dibaca
  const label = (id: string) => (me && id === me ? 'Saya' : personName(id));

  const netEdges = useMemo(() => {
    return getNetEdges(debts, payments)
      .map((e) => ({
        fromId: e.fromId,
        toId: e.toId,
        from: me && e.fromId === me ? 'Saya' : personName(e.fromId),
        to: me && e.toId === me ? 'Saya' : personName(e.toId),
        amount: e.amount,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [debts, payments, personName, me]);

  async function handleSettle(fromId: string, toId: string, from: string, to: string, amount: number) {
    const ok = await confirmDialog({
      title: 'Tandai Lunas?',
      message: `Semua hutang antara ${from} dan ${to} (net ${formatCurrency(amount)}) akan langsung ditandai lunas.`,
      confirmLabel: 'Lunas',
    });
    if (!ok) return;
    try {
      await settleAllBetween(fromId, toId);
      showToast('✓ Hutang berhasil ditandai lunas');
    } catch (err) {
      console.error('Gagal menandai lunas:', err);
      showToast('✗ Gagal menandai lunas, coba lagi');
    }
  }

  // SKELETON LOADING (sebelum render utama & empty state)
  if (loading) return <DashboardSkeleton />;

  // EARLY RETURN UNTUK EMPTY STATE
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

  const netPosition = totalReceivable - totalDebt;

  // RENDER UTAMA (Data sudah siap)
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

      {me && (
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1">Posisi Bersih (Piutang − Hutang)</p>
          <p
            className={`text-2xl font-bold ${
              netPosition > 0 ? 'text-emerald-600' : netPosition < 0 ? 'text-red-600' : 'text-slate-800'
            }`}
          >
            {netPosition > 0 ? '+' : netPosition < 0 ? '−' : ''}
            {formatCurrency(Math.abs(netPosition))}
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
          <p className="text-xs text-slate-500 mb-1">Transaksi Aktif</p>
          <p className="text-xl font-bold text-slate-800">{activeCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1">Jatuh Tempo Terdekat</p>
          <p className="text-base font-bold text-slate-800">
            {nearestDue ? formatDate(nearestDue.dueDate, true) : '-'}
          </p>
        </Card>
      </div>

      {totalAmount > 0 && (
        <Card className="p-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Progres pelunasan</span>
            <span>
              {paidPct}% · sisa {formatCurrency(totalRemaining)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${paidPct}%` }}
            />
          </div>
        </Card>
      )}

      {attention.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-800 text-sm">Perlu Perhatian</h3>
            <Link to="/hutang" className="text-xs text-indigo-600 font-medium">
              Lihat semua
            </Link>
          </div>
          <div className="space-y-2">
            {attention.map(({ entry, info }) => (
              <Link key={entry.key} to={`/hutang/${entry.linkId}`} className="block">
                <Card className="p-3.5 hover:border-indigo-200 transition">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {entryTitle(entry, label)}
                    </p>
                    <Badge color={info.color}>{info.text}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs text-slate-500">
                      {entry.isGroup ? `${entry.debts.length} orang · ` : ''}
                      jatuh tempo {formatDate(entry.dueDate, true)}
                    </p>
                    <p className="text-sm font-semibold text-slate-800">{formatCurrency(entry.remaining)}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

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
                    <p
                      className={`text-sm font-semibold mt-0.5 ${
                        me && e.fromId === me
                          ? 'text-red-600'
                          : me && e.toId === me
                            ? 'text-emerald-600'
                            : 'text-slate-800'
                      }`}
                    >
                      {formatCurrency(e.amount)}
                    </p>
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