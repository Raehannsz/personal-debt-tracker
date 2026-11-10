import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useDebt, usePaymentsForDebt, usePersons } from '../hooks/useData';
import { getTotalPaid, getRemainingDebt } from '../services/debtLogic';
import { formatCurrency, formatDate, formatTime } from '../utils/format';
import { Card, Badge, Button } from '../components/ui';
import { statusColor, statusLabel } from '../components/debtStatus';
import { PaymentFormModal } from '../components/PaymentFormModal';
import { DebtFormModal } from '../components/DebtFormModal';
import { cancelDebt, deleteDebt } from '../services/debtRepo';
import { confirmDialog } from '../stores/confirmStore';
import { showToast } from '../stores/toastStore';
import { usePageLoading } from '../hooks/usePageLoading';
import { DebtDetailSkeleton } from '../components/Skeleton';
import { getDueInfo } from '../utils/due';

const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function getDayName(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return DAYS_ID[d.getDay()];
}

export function DebtDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const debt = useDebt(id);
  const payments = usePaymentsForDebt(id);
  const persons = usePersons(true);
  const [showPayment, setShowPayment] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const loading = usePageLoading(['persons', 'debts', 'payments']);

  // Kembali ke halaman sebelumnya; kalau halaman ini dibuka langsung (tanpa riwayat), ke daftar hutang.
  function goBack() {
    if (location.key !== 'default') navigate(-1);
    else navigate('/hutang');
  }

  const backButton = (
    <button
      type="button"
      onClick={goBack}
      className="inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 -ml-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
    >
      <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
      Kembali
    </button>
  );

  if (loading) return <DebtDetailSkeleton />;

  if (!debt) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        {backButton}
        <p className="text-slate-500 text-sm">Transaksi tidak ditemukan.</p>
      </div>
    );
  }

  const debtor = persons.find((p) => p.id === debt.debtorId);
  const creditor = persons.find((p) => p.id === debt.creditorId);
  const paid = getTotalPaid(debt.id, payments);
  const remaining = getRemainingDebt(debt, payments);
  const isPaid = debt.status === 'PAID';
  const isCancelled = debt.status === 'CANCELLED';
  const progress = debt.amount > 0 ? Math.min(100, Math.round((paid / debt.amount) * 100)) : 0;
  const dueInfo = !isPaid && !isCancelled ? getDueInfo(debt.dueDate) : null;
  // payments sudah diurutkan terbaru dulu — ambil catatan dari pembayaran paling baru.
  const latestNote = payments.find((p) => p.notes)?.notes;

  async function handleDelete() {
    const ok = await confirmDialog({
      title: 'Hapus Transaksi?',
      message: 'Transaksi ini akan dihapus permanen beserta riwayat pembayarannya.',
      confirmLabel: 'Hapus',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDebt(debt!.id);
      showToast('✓ Hutang berhasil dihapus');
      navigate('/hutang');
    } catch (err) {
      console.error('Gagal menghapus hutang:', err);
      showToast('✗ Gagal menghapus, coba lagi');
    }
  }

  async function handleCancel() {
    const ok = await confirmDialog({
      title: 'Batalkan Transaksi?',
      message: 'Transaksi ini akan ditandai sebagai dibatalkan dan tidak dihitung dalam ringkasan.',
      confirmLabel: 'Batalkan',
      danger: true,
    });
    if (!ok) return;
    try {
      await cancelDebt(debt!.id);
      showToast('✓ Hutang dibatalkan');
    } catch (err) {
      console.error('Gagal membatalkan hutang:', err);
      showToast('✗ Gagal membatalkan, coba lagi');
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        {backButton}
        <h2 className="text-lg font-semibold text-slate-800">Detail Hutang</h2>
      </div>

      <Card className="p-5 text-center">
        <div className="flex items-center justify-center gap-2 text-slate-800 font-semibold">
          <span>{debtor?.name ?? '—'}</span>
          <span className="text-slate-400">↓</span>
        </div>
        <p className="font-semibold text-slate-800 mb-3">{creditor?.name ?? '—'}</p>
        <p className={`text-3xl font-bold ${isPaid ? 'text-slate-400' : 'text-slate-900'}`}>
          {formatCurrency(debt.amount)}
        </p>
        <div className="mt-2 flex justify-center items-center gap-2 flex-wrap">
          <Badge color={statusColor(debt.status)}>{statusLabel(debt.status)}</Badge>
          {isPaid && <span className="text-xs text-slate-400">✓ Lunas</span>}
          {dueInfo && <Badge color={dueInfo.color}>{dueInfo.text}</Badge>}
        </div>

        {!isCancelled && (
          <div className="mt-4 text-left">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Terbayar</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-4 text-left">
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500">Sudah dibayar</p>
            <p className={`font-semibold ${isPaid ? 'text-slate-500' : 'text-emerald-600'}`}>
              {formatCurrency(paid)}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500">Sisa</p>
            {isPaid ? (
              <p className="font-semibold text-slate-500">Lunas</p>
            ) : (
              <p className="font-semibold text-red-600">{formatCurrency(remaining)}</p>
            )}
          </div>
        </div>

        <div className="mt-4 text-left space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Tanggal</span>
            <span className="text-slate-800">
              {getDayName(debt.transactionDate) && `${getDayName(debt.transactionDate)}, `}
              {formatDate(debt.transactionDate)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Dicatat pukul</span>
            <span className="text-slate-800">{formatTime(debt.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Jatuh tempo</span>
            <span className="text-slate-800">
              {getDayName(debt.dueDate) && `${getDayName(debt.dueDate)}, `}
              {formatDate(debt.dueDate)}
            </span>
          </div>

          {debt.description && (
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 shrink-0">Keterangan</span>
              <span className="text-slate-800 text-right break-words min-w-0">{debt.description}</span>
            </div>
          )}

          {latestNote && (
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 shrink-0">Catatan terakhir</span>
              <span className="text-slate-800 text-right italic break-words min-w-0">
                "{latestNote}"
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          {debt.status !== 'PAID' && debt.status !== 'CANCELLED' && (
            <Button className="flex-1" onClick={() => setShowPayment(true)}>
              Bayar
            </Button>
          )}
          <Button variant="secondary" className="flex-1" onClick={() => setShowEdit(true)}>
            Edit
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          {debt.status !== 'CANCELLED' && (
            <Button variant="ghost" className="flex-1" onClick={handleCancel}>
              Batalkan
            </Button>
          )}
          <Button variant="ghost" className="flex-1 !text-red-600" onClick={handleDelete}>
            Hapus
          </Button>
        </div>
      </Card>

      <div>
        <h3 className="font-semibold text-slate-800 text-sm mb-2">
          Riwayat Pembayaran{payments.length > 0 && ` (${payments.length})`}
        </h3>
        {payments.length === 0 ? (
          <p className="text-sm text-slate-400 px-1">Belum ada pembayaran.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <Card key={p.id} className="p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-slate-800">
                    {getDayName(p.paymentDate) && `${getDayName(p.paymentDate)}, `}
                    {formatDate(p.paymentDate, true)} · {formatTime(p.createdAt)}
                  </p>
                  {p.notes && <p className="text-xs text-slate-500 mt-0.5 break-words">{p.notes}</p>}
                </div>
                <p className="text-sm font-semibold text-emerald-600 shrink-0">{formatCurrency(p.amount)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <PaymentFormModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        debtId={debt.id}
        maxAmount={remaining}
      />
      <DebtFormModal open={showEdit} onClose={() => setShowEdit(false)} editingDebt={debt} />
    </div>
  );
}