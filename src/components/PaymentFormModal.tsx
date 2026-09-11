import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button, Input, Label, Textarea } from './ui';
import { addPayment } from '../services/debtRepo';
import { formatCurrency, parseCurrencyInput, toDateInputValue, fromDateInputValue } from '../utils/format';
import { showToast } from '../stores/toastStore';

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

  useEffect(() => {
    if (open) {
      setAmountStr('');
      setPaymentDate(toDateInputValue(new Date().toISOString()));
      setNotes('');
      setError('');
    }
  }, [open]);

  const amount = parseCurrencyInput(amountStr);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0) return setError('Nominal harus lebih besar dari 0.');
    if (amount > maxAmount) return setError(`Nominal tidak boleh melebihi sisa hutang (${formatCurrency(maxAmount)}).`);

    await addPayment({
      debtId,
      amount,
      paymentDate: fromDateInputValue(paymentDate),
      notes,
    });
    showToast('✓ Pembayaran berhasil dicatat');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Catat Pembayaran">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-500">Sisa hutang: {formatCurrency(maxAmount)}</p>
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full">
          Simpan
        </Button>
      </form>
    </Modal>
  );
}
