import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button, Input, Label, Select, Textarea } from './ui';
import { usePersons } from '../hooks/useData';
import { createDebt, updateDebt } from '../services/debtRepo';
import { formatCurrency, parseCurrencyInput, toDateInputValue, fromDateInputValue } from '../utils/format';
import { showToast } from '../stores/toastStore';
import type { Debt } from '../types';
import { getErrorMessage } from '../lib/supabase';

const DUE_PRESETS = [7, 14, 30];

// Tambah N hari ke tanggal berformat YYYY-MM-DD (pakai waktu lokal, bukan UTC).
function addDays(base: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(base);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
  d.setDate(d.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function Required() {
  return <span className="text-red-500"> *</span>;
}

function Optional() {
  return <span className="text-slate-400 font-normal text-xs"> (opsional)</span>;
}

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
    if (!debtorId) return setError('Yang berhutang wajib dipilih.');
    if (!creditorId) return setError('Pemberi hutang (kepada) wajib dipilih.');
    if (debtorId === creditorId) return setError('Yang berhutang tidak boleh sama dengan pemberi hutang.');
    if (amount <= 0) return setError('Nominal harus lebih besar dari 0.');
    if (!transactionDate) return setError('Tanggal wajib diisi.');
    if (dueDate && dueDate < transactionDate) {
      return setError('Jatuh tempo tidak boleh lebih awal dari tanggal transaksi.');
    }

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
          <Label>
            Yang berhutang
            <Required />
          </Label>
          <Select value={debtorId} onChange={(e) => setDebtorId(e.target.value)}>
            <option value="">Pilih orang</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === creditorId}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>
            Kepada
            <Required />
          </Label>
          <Select value={creditorId} onChange={(e) => setCreditorId(e.target.value)}>
            <option value="">Pilih orang</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === debtorId}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>
            Nominal
            <Required />
          </Label>
          <Input
            inputMode="numeric"
            placeholder="Rp 0"
            value={amountStr ? formatCurrency(amount) : ''}
            onChange={(e) => setAmountStr(e.target.value)}
          />
        </div>
        <div>
          <Label>
            Keterangan
            <Optional />
          </Label>
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>
              Tanggal
              <Required />
            </Label>
            <Input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
          </div>
          <div>
            <Label>
              Jatuh tempo
              <Optional />
            </Label>
            <Input
              type="date"
              value={dueDate}
              min={transactionDate || undefined}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 -mt-1">
          <span className="text-xs text-slate-500">Atur jatuh tempo:</span>
          {DUE_PRESETS.map((days) => {
            const value = addDays(transactionDate, days);
            const active = dueDate === value;
            return (
              <button
                key={days}
                type="button"
                onClick={() => setDueDate(value)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                  active
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                +{days} hari
              </button>
            );
          })}
          {dueDate && (
            <button
              type="button"
              onClick={() => setDueDate('')}
              className="text-xs font-medium text-slate-500 hover:text-red-600 px-1.5 py-1"
            >
              Hapus
            </button>
          )}
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