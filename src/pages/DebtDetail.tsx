import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

export function DebtDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const debt = useDebt(id);
  const payments = usePaymentsForDebt(id);
  const persons = usePersons(true);
  const [showPayment, setShowPayment] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  if (!debt) {
    return <div className="p-6 text-slate-500 text-sm">Transaksi tidak ditemukan.</div>;
  }

  const debtor = persons.find((p) => p.id === debt.debtorId);
  const creditor = persons.find((p) => p.id === debt.creditorId);
  const paid = getTotalPaid(debt.id, payments);
  const remaining = getRemainingDebt(debt, payments);

  async function handleDelete() {
    const ok = await confirmDialog({
      title: 'Hapus Transaksi?',
      message: 'Transaksi ini akan dihapus permanen beserta riwayat pembayarannya.',
      confirmLabel: 'Hapus',
      danger: true,
    });
    if (!ok) return;
    await deleteDebt(debt!.id);
    showToast('✓ Hutang berhasil dihapus');
    navigate('/hutang');
  }

  async function handleCancel() {
    const ok = await confirmDialog({
      title: 'Batalkan Transaksi?',
      message: 'Transaksi ini akan ditandai sebagai dibatalkan dan tidak dihitung dalam ringkasan.',
      confirmLabel: 'Batalkan',
      danger: true,
    });
    if (!ok) return;
    await cancelDebt(debt!.id);
    showToast('✓ Hutang dibatalkan');
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Card className="p-5 text-center">
        <div className="flex items-center justify-center gap-2 text-slate-800 font-semibold">
          <span>{debtor?.name ?? '—'}</span>
          <span className="text-slate-400">↓</span>
        </div>
        <p className="font-semibold text-slate-800 mb-3">{creditor?.name ?? '—'}</p>
        <p className="text-3xl font-bold text-slate-900">{formatCurrency(debt.amount)}</p>
        <div className="mt-2 flex justify-center">
          <Badge color={statusColor(debt.status)}>{statusLabel(debt.status)}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5 text-left">
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500">Sudah dibayar</p>
            <p className="font-semibold text-emerald-600">{formatCurrency(paid)}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500">Sisa</p>
            <p className="font-semibold text-red-600">{formatCurrency(remaining)}</p>
          </div>
        </div>

        <div className="mt-4 text-left space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Tanggal</span>
            <span className="text-slate-800">{formatDate(debt.transactionDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Dicatat pukul</span>
            <span className="text-slate-800">{formatTime(debt.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Jatuh tempo</span>
            <span className="text-slate-800">{formatDate(debt.dueDate)}</span>
          </div>
          {debt.description && (
            <div className="pt-2 border-t border-slate-100 mt-2">
              <p className="text-slate-500 mb-0.5">Keterangan</p>
              <p className="text-slate-800">{debt.description}</p>
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
        <h3 className="font-semibold text-slate-800 text-sm mb-2">Riwayat Pembayaran</h3>
        {payments.length === 0 ? (
          <p className="text-sm text-slate-400 px-1">Belum ada pembayaran.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <Card key={p.id} className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-800">
                    {formatDate(p.paymentDate, true)} · {formatTime(p.createdAt)}
                  </p>
                  {p.notes && <p className="text-xs text-slate-500 mt-0.5">{p.notes}</p>}
                </div>
                <p className="text-sm font-semibold text-emerald-600">{formatCurrency(p.amount)}</p>
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
