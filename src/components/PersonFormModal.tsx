import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button, Input, Label, Textarea } from './ui';
import { createPerson, updatePerson } from '../services/personRepo';
import { showToast } from '../stores/toastStore';
import type { Person } from '../types';

export function PersonFormModal({
  open,
  onClose,
  editingPerson,
}: {
  open: boolean;
  onClose: () => void;
  editingPerson?: Person | null;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(editingPerson?.name ?? '');
    setPhone(editingPerson?.phone ?? '');
    setEmail(editingPerson?.email ?? '');
    setNotes(editingPerson?.notes ?? '');
    setError('');
  }, [open, editingPerson]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Nama wajib diisi.');

    if (editingPerson) {
      await updatePerson(editingPerson.id, { name, phone, email, notes });
      showToast('✓ Data orang berhasil diperbarui');
    } else {
      await createPerson({ name, phone, email, notes });
      showToast('✓ Orang berhasil ditambahkan');
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editingPerson ? 'Edit Orang' : 'Tambah Orang'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Nama *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <Label>Nomor Telepon</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
