import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button, Input, Label, Textarea } from './ui';
import { addPayment } from '../services/debtRepo';
import { formatCurrency, parseCurrencyInput, toDateInputValue, fromDateInputValue } from '../utils/format';
import { showToast } from '../stores/toastStore';
import { getErrorMessage } from '../lib/supabase';

export function PaymentFormModal({
  open,
  onClose,
  debtId,
  maxAmount,
}: {
  open: boolean;
  onClose: () => void;
  debtId: string;
  maxAmount: number;
}) {
  const [amountStr, setAmountStr] = useState('');
  const [paymentDate, setPaymentDate] = useState(toDateInputValue(new Date().toISOString()));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAmountStr('');
      setPaymentDate(toDateInputValue(new Date().toISOString()));
      setNotes('');
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  const amount = parseCurrencyInput(amountStr);

  async function submitPayment(payAmount: number) {
    if (submitting) return; // cegah double-submit kalau tombol ke-tap dua kali
    setError('');

    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      setError('Nominal harus lebih besar dari 0.');
      return;
    }
    if (payAmount > maxAmount) {
      setError(`Nominal tidak boleh melebihi sisa hutang (${formatCurrency(maxAmount)}).`);
      return;
    }

    setSubmitting(true);
    try {
      await addPayment({
        debtId,
        amount: payAmount,
        paymentDate: fromDateInputValue(paymentDate),
        notes,
      });
      showToast('✓ Pembayaran berhasil dicatat');
      onClose();
    } catch (err) {
      console.error('Gagal mencatat pembayaran:', err);
      setError(`Gagal menyimpan pembayaran: ${getErrorMessage(err)}`);
      showToast('✗ Pembayaran gagal disimpan');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitPayment(amount);
  }

  return (
    <Modal open={open} onClose={onClose} title="Catat Pembayaran">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-500">Sisa hutang: {formatCurrency(maxAmount)}</p>

        <button
          type="button"
          disabled={submitting || maxAmount <= 0}
          onClick={() => submitPayment(maxAmount)}
          className="w-full rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 text-emerald-700 text-sm font-medium py-2.5 hover:bg-emerald-100 transition disabled:opacity-50"
        >
          ✓ Bayar Lunas Sekaligus ({formatCurrency(maxAmount)})
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="flex-1 h-px bg-slate-200" />
          atau bayar sebagian
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <div>
          <Label>Nominal Pembayaran</Label>
          <Input
            inputMode="numeric"
            placeholder="Rp 0"
            value={amountStr ? formatCurrency(amount) : ''}
            onChange={(e) => setAmountStr(e.target.value)}
          />
        </div>
        <div>
          <Label>Tanggal Bayar</Label>
          <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
        </div>
        <div>
          <Label>Catatan</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </form>
    </Modal>
  );
}
