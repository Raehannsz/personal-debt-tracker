import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button, Input, Label, Select, Textarea } from './ui';
import { usePersons } from '../hooks/useData';
import { createDebt, updateDebt } from '../services/debtRepo';
import { formatCurrency, parseCurrencyInput, toDateInputValue, fromDateInputValue } from '../utils/format';
import { showToast } from '../stores/toastStore';
import type { Debt } from '../types';
import { getErrorMessage } from '../lib/supabase';

export function DebtFormModal({
  open,
  onClose,
  editingDebt,
  defaultDebtorId,
}: {
  open: boolean;
  onClose: () => void;
  editingDebt?: Debt | null;
  defaultDebtorId?: string;
}) {
  const persons = usePersons();
  const [debtorId, setDebtorId] = useState('');
  const [creditorId, setCreditorId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [transactionDate, setTransactionDate] = useState(toDateInputValue(new Date().toISOString()));
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingDebt) {
      setDebtorId(editingDebt.debtorId);
      setCreditorId(editingDebt.creditorId);
      setAmountStr(String(editingDebt.amount));
      setTransactionDate(toDateInputValue(editingDebt.transactionDate));
      setDueDate(toDateInputValue(editingDebt.dueDate));
      setDescription(editingDebt.description ?? '');
    } else {
      setDebtorId(defaultDebtorId ?? '');
      setCreditorId('');
      setAmountStr('');
      setTransactionDate(toDateInputValue(new Date().toISOString()));
      setDueDate('');
      setDescription('');
    }
    setError('');
    setSubmitting(false);
  }, [open, editingDebt, defaultDebtorId]);

  const amount = parseCurrencyInput(amountStr);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!debtorId) return setError('Debtor wajib dipilih.');
    if (!creditorId) return setError('Creditor wajib dipilih.');
    if (debtorId === creditorId) return setError('Debtor tidak boleh sama dengan creditor.');
    if (amount <= 0) return setError('Nominal harus lebih besar dari 0.');

    const payload = {
      debtorId,
      creditorId,
      amount,
      description,
      transactionDate: fromDateInputValue(transactionDate),
      dueDate: dueDate ? fromDateInputValue(dueDate) : null,
    };

    setError('');
    setSubmitting(true);
    try {
      if (editingDebt) {
        await updateDebt(editingDebt.id, payload);
        showToast('✓ Hutang berhasil diperbarui');
      } else {
        await createDebt(payload);
        showToast('✓ Hutang berhasil ditambahkan');
      }
      onClose();
    } catch (err) {
      console.error('Gagal menyimpan hutang:', err);
      setError(`Gagal menyimpan: ${getErrorMessage(err)}`);
      showToast('✗ Gagal menyimpan, coba lagi');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editingDebt ? 'Edit Hutang' : 'Tambah Hutang'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Yang berhutang</Label>
          <Select value={debtorId} onChange={(e) => setDebtorId(e.target.value)}>
            <option value="">Pilih orang</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Kepada</Label>
          <Select value={creditorId} onChange={(e) => setCreditorId(e.target.value)}>
            <option value="">Pilih orang</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Nominal</Label>
          <Input
            inputMode="numeric"
            placeholder="Rp 0"
            value={amountStr ? formatCurrency(amount) : ''}
            onChange={(e) => setAmountStr(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tanggal</Label>
            <Input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
          </div>
          <div>
            <Label>Jatuh tempo</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Keterangan</Label>
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
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
