import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePersons, useDebts, usePayments } from '../hooks/useData';
import { getNetBalance } from '../services/debtLogic';
import { useSettings } from '../hooks/useData';
import { formatCurrency } from '../utils/format';
import { Card, Button, Input, EmptyState } from '../components/ui';
import { PersonFormModal } from '../components/PersonFormModal';
import { deletePerson, personHasActiveDebts } from '../services/personRepo';
import { confirmDialog } from '../stores/confirmStore';
import { showToast } from '../stores/toastStore';
import type { Person } from '../types';

export function Persons() {
  const persons = usePersons();
  const debts = useDebts();
  const payments = usePayments();
  const settings = useSettings();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return persons;
    const q = search.trim().toLowerCase();
    return persons.filter((p) => p.name.toLowerCase().includes(q));
  }, [persons, search]);

  async function handleDelete(p: Person) {
    const hasDebts = await personHasActiveDebts(p.id);
    const ok = await confirmDialog({
      title: 'Hapus Orang?',
      message: hasDebts
        ? `${p.name} masih memiliki transaksi hutang. Menghapus orang ini dapat mempengaruhi data transaksi. Yakin ingin menghapus?`
        : `Yakin ingin menghapus ${p.name}?`,
      confirmLabel: 'Hapus',
      danger: true,
    });
    if (!ok) return;
    await deletePerson(p.id);
    showToast('✓ Orang berhasil dihapus');
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Orang</h2>
        <Button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          + Tambah Orang
        </Button>
      </div>

      {persons.length > 0 && (
        <Input placeholder="Cari nama..." value={search} onChange={(e) => setSearch(e.target.value)} />
      )}

      {persons.length === 0 ? (
        <EmptyState
          title="Belum ada orang"
          description="Tambahkan orang untuk mulai mencatat hutang."
          action={<Button onClick={() => setShowForm(true)}>+ Tambah Orang</Button>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const net = settings.myPersonId
              ? getNetBalance(settings.myPersonId, p.id, debts, payments)
              : null;
            return (
              <Card key={p.id} className="p-3.5">
                <div className="flex items-center justify-between">
                  <Link to={`/orang/${p.id}`} className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 flex items-center gap-1.5">
                      {p.name}
                      {p.isMe && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 rounded-full px-1.5 py-0.5">
                          Saya
                        </span>
                      )}
                    </p>
                    {p.phone && <p className="text-xs text-slate-400">{p.phone}</p>}
                  </Link>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditing(p);
                        setShowForm(true);
                      }}
                      className="text-xs text-slate-500 px-2 py-1.5 hover:bg-slate-100 rounded-lg"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="text-xs text-red-500 px-2 py-1.5 hover:bg-red-50 rounded-lg"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
                {net && !p.isMe && net.direction !== 'SETTLED' && (
                  <div className="mt-2 pt-2 border-t border-slate-100 text-xs flex justify-between">
                    <span className="text-slate-500">
                      {net.direction === 'I_OWE'
                        ? `Saya berhutang kepada ${p.name}`
                        : `${p.name} berhutang kepada saya`}
                      <span className="text-slate-400"> (net)</span>
                    </span>
                    <span className={`font-medium ${net.direction === 'I_OWE' ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatCurrency(net.amount)}
                    </span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <PersonFormModal open={showForm} onClose={() => setShowForm(false)} editingPerson={editing} />
    </div>
  );
}
