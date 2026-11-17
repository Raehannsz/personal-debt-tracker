import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button, Input, Label, Select, Textarea } from './ui';
import { usePersons } from '../hooks/useData';
import { useSplitPrefs } from '../hooks/useSplitPrefs';
import { createDebts, updateDebt } from '../services/debtRepo';
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

type Row = { key: string; personId: string; amountStr: string };

let rowSeq = 0;
function newRow(personId = ''): Row {
  rowSeq += 1;
  return { key: `row-${rowSeq}`, personId, amountStr: '' };
}

// Bagi total ke n bagian dalam rupiah bulat; sisa pembagian dibagikan ke bagian-bagian pertama.
function splitEvenly(total: number, n: number): number[] {
  if (n <= 0) return [];
  const t = Math.max(0, Math.round(total));
  const base = Math.floor(t / n);
  const rem = t - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
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
  const { includeCreditor } = useSplitPrefs();
  const isEditing = !!editingDebt;

  // Mode edit: tetap satu orang (satu baris hutang)
  const [debtorId, setDebtorId] = useState('');
  const [amountStr, setAmountStr] = useState('');

  // Mode tambah: banyak orang, semua nominal bisa diedit
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [totalStr, setTotalStr] = useState('');

  const [creditorId, setCreditorId] = useState('');
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
      setDebtorId('');
      setAmountStr('');
      setRows([newRow(defaultDebtorId ?? '')]);
      setTotalStr('');
      setCreditorId('');
      setTransactionDate(toDateInputValue(new Date().toISOString()));
      setDueDate('');
      setDescription('');
    }
    setError('');
    setSubmitting(false);
  }, [open, editingDebt, defaultDebtorId]);

  const amount = parseCurrencyInput(amountStr); // mode edit
  const totalInput = parseCurrencyInput(totalStr);
  const totalRounded = Math.round(totalInput);

  // Nominal setiap orang = angka yang tersimpan di barisnya (selalu bisa diedit).
  const amounts = rows.map((r) => parseCurrencyInput(r.amountStr));
  const grandTotal = amounts.reduce((sum, a) => sum + a, 0);

  // Bagi rata `total` ke semua baris (plus satu bagian untuk pemberi hutang kalau opsinya aktif di Settings).
  function distribute(list: Row[], total: number): Row[] {
    const shares = splitEvenly(total, list.length + (includeCreditor ? 1 : 0));
    return list.map((r, i) => ({ ...r, amountStr: String(shares[i] ?? 0) }));
  }

  const evenShares = splitEvenly(totalRounded, rows.length + (includeCreditor ? 1 : 0));
  const isEven = rows.every((_, i) => amounts[i] === (evenShares[i] ?? 0));

  // Total diubah → semua nominal orang menyesuaikan (dibagi rata dari total baru).
  function handleTotalChange(value: string) {
    setTotalStr(value);
    const t = Math.round(parseCurrencyInput(value));
    if (t > 0) setRows((prev) => distribute(prev, t));
  }

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => {
      const next = [...prev, newRow()];
      return totalRounded > 0 ? distribute(next, totalRounded) : next;
    });
  }

  function removeRow(key: string) {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((r) => r.key !== key);
      return totalRounded > 0 ? distribute(next, totalRounded) : next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    // Validasi umum
    if (!creditorId) return setError('Pemberi hutang (kepada) wajib dipilih.');
    if (!transactionDate) return setError('Tanggal wajib diisi.');
    if (dueDate && dueDate < transactionDate) {
      return setError('Jatuh tempo tidak boleh lebih awal dari tanggal transaksi.');
    }

    const common = {
      creditorId,
      description,
      transactionDate: fromDateInputValue(transactionDate),
      dueDate: dueDate ? fromDateInputValue(dueDate) : null,
    };

    // ── Mode edit: satu orang ──
    if (editingDebt) {
      if (!debtorId) return setError('Yang berhutang wajib dipilih.');
      if (debtorId === creditorId) return setError('Yang berhutang tidak boleh sama dengan pemberi hutang.');
      if (amount <= 0) return setError('Nominal harus lebih besar dari 0.');

      setError('');
      setSubmitting(true);
      try {
        await updateDebt(editingDebt.id, { ...common, debtorId, amount });
        showToast('✓ Hutang berhasil diperbarui');
        onClose();
      } catch (err) {
        console.error('Gagal menyimpan hutang:', err);
        setError(`Gagal menyimpan: ${getErrorMessage(err)}`);
        showToast('✗ Gagal menyimpan, coba lagi');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // ── Mode tambah: banyak orang ──
    if (rows.some((r) => !r.personId)) return setError('Semua baris "Yang berhutang" wajib dipilih orangnya.');
    const ids = rows.map((r) => r.personId);
    if (new Set(ids).size !== ids.length) return setError('Ada orang yang dipilih lebih dari sekali.');
    if (ids.includes(creditorId)) return setError('Yang berhutang tidak boleh sama dengan pemberi hutang.');

    const items = rows.map((r, i) => ({ debtorId: r.personId, amount: amounts[i] }));
    if (items.some((it) => !(it.amount > 0))) {
      return setError('Nominal setiap orang harus lebih besar dari 0. Isi total nominal atau ketik nominalnya langsung.');
    }

    setError('');
    setSubmitting(true);
    try {
      await createDebts({ ...common, items });
      showToast(items.length > 1 ? `✓ ${items.length} hutang berhasil ditambahkan` : '✓ Hutang berhasil ditambahkan');
      onClose();
    } catch (err) {
      console.error('Gagal menyimpan hutang:', err);
      setError(`Gagal menyimpan: ${getErrorMessage(err)}`);
      showToast('✗ Gagal menyimpan, coba lagi');
    } finally {
      setSubmitting(false);
    }
  }

  const chosenIds = new Set(rows.map((r) => r.personId).filter(Boolean));

  // Catatan di bawah daftar orang
  let note: { text: string; warn: boolean } | null = null;
  if (totalRounded > 0) {
    if (includeCreditor) {
      const creditorShare = totalRounded - grandTotal;
      note =
        creditorShare >= 0
          ? {
              text: `Bagian pemberi hutang ${formatCurrency(creditorShare)} tidak dicatat sebagai hutang.`,
              warn: false,
            }
          : { text: `Total nominal orang-orang melebihi total ${formatCurrency(totalRounded)}.`, warn: true };
    } else if (grandTotal !== totalRounded) {
      note = {
        text: `Total semua ${formatCurrency(grandTotal)} berbeda ${formatCurrency(Math.abs(totalRounded - grandTotal))} dari total nominal.`,
        warn: true,
      };
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Hutang' : 'Tambah Hutang'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {isEditing ? (
          <>
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
          </>
        ) : (
          <>
            <div>
              <Label>
                Kepada (pemberi hutang)
                <Required />
              </Label>
              <Select value={creditorId} onChange={(e) => setCreditorId(e.target.value)}>
                <option value="">Pilih orang</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id} disabled={chosenIds.has(p.id)}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>
                Total nominal
                <Optional />
              </Label>
              <Input
                inputMode="numeric"
                placeholder="Rp 0"
                value={totalStr ? formatCurrency(totalInput) : ''}
                onChange={(e) => handleTotalChange(e.target.value)}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Mengisi atau mengubah total akan membagi rata nominal semua orang. Setelah itu, nominal tiap orang
                bisa diubah sendiri tanpa memengaruhi yang lain.
              </p>
            </div>

            {/* Daftar orang yang berhutang: semua nominal bisa diedit */}
            <div>
              <Label>
                Yang berhutang ({rows.length} orang)
                <Required />
              </Label>
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <div key={row.key} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <Select value={row.personId} onChange={(e) => updateRow(row.key, { personId: e.target.value })}>
                        <option value="">Pilih orang</option>
                        {persons.map((p) => (
                          <option
                            key={p.id}
                            value={p.id}
                            disabled={p.id === creditorId || (chosenIds.has(p.id) && p.id !== row.personId)}
                          >
                            {p.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="w-32 shrink-0">
                      <Input
                        inputMode="numeric"
                        placeholder="Rp 0"
                        className="text-right"
                        value={row.amountStr ? formatCurrency(amounts[i]) : ''}
                        onChange={(e) => updateRow(row.key, { amountStr: e.target.value })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      disabled={rows.length <= 1}
                      aria-label="Hapus orang ini"
                      className="shrink-0 w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <button type="button" onClick={addRow} className="text-sm font-medium text-indigo-600 hover:underline">
                  + Tambah orang
                </button>
                {totalRounded > 0 && !isEven && (
                  <button
                    type="button"
                    onClick={() => setRows((prev) => distribute(prev, totalRounded))}
                    className="text-xs font-medium text-slate-500 hover:text-indigo-600"
                  >
                    ↺ Bagi rata ulang
                  </button>
                )}
              </div>
              {grandTotal > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  Total hutang:{' '}
                  <span className="font-semibold text-slate-700">{formatCurrency(grandTotal)}</span>
                </p>
              )}
              {note && (
                <p className={`mt-1 text-xs ${note.warn ? 'text-amber-600' : 'text-slate-500'}`}>{note.text}</p>
              )}
            </div>
          </>
        )}

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