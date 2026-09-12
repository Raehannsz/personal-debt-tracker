import { useRef } from 'react';
import { usePersons, useSettings } from '../hooks/useData';
import { updateSettings, exportData, downloadBackup, validateBackup, importData, resetAllData } from '../services/settingsRepo';
import { deleteAllDebts } from '../services/debtRepo';
import { Card, Button, Label, Select } from '../components/ui';
import { confirmDialog } from '../stores/confirmStore';
import { showToast } from '../stores/toastStore';
import { seedDemoData, clearDemoData, isEmpty } from '../data/seed';

export function Settings() {
  const persons = usePersons();
  const settings = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleMyPersonChange(id: string) {
    try {
      await updateSettings({ myPersonId: id || null });
      showToast('✓ Profil berhasil diperbarui');
    } catch (err) {
      console.error('Gagal memperbarui profil:', err);
      showToast('✗ Gagal menyimpan, coba lagi');
    }
  }

  async function handleExport() {
    try {
      const data = await exportData();
      downloadBackup(data);
      showToast('✓ Data berhasil diexport');
    } catch (err) {
      console.error('Gagal export data:', err);
      showToast('✗ Gagal export, coba lagi');
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!validateBackup(json)) {
        showToast('✗ Format file tidak valid');
        return;
      }
      const ok = await confirmDialog({
        title: 'Import Data?',
        message: 'Semua data saat ini akan digantikan dengan data dari file backup ini. Lanjutkan?',
        confirmLabel: 'Import',
        danger: true,
      });
      if (!ok) return;
      await importData(json);
      showToast('✓ Data berhasil diimport');
    } catch (err) {
      console.error('Import gagal:', err);
      showToast('✗ File tidak dapat dibaca atau formatnya tidak valid');
    }
  }

  async function handleReset() {
    const ok = await confirmDialog({
      title: 'Reset Semua Data?',
      message: 'SEMUA data (orang, hutang, pembayaran) akan dihapus permanen dan tidak dapat dikembalikan. Lanjutkan?',
      confirmLabel: 'Reset',
      danger: true,
    });
    if (!ok) return;
    try {
      await resetAllData();
      showToast('✓ Semua data berhasil direset');
    } catch (err) {
      console.error('Gagal reset data:', err);
      showToast('✗ Gagal reset data, coba lagi');
    }
  }

  async function handleDeleteAllDebts() {
    const ok = await confirmDialog({
      title: 'Hapus Semua Hutang?',
      message: 'Semua transaksi hutang beserta riwayat pembayarannya akan dihapus permanen dan tidak dapat dikembalikan. Data orang tidak akan terhapus. Lanjutkan?',
      confirmLabel: 'Hapus Semua',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteAllDebts();
      showToast('✓ Semua hutang berhasil dihapus');
    } catch (err) {
      console.error('Gagal menghapus hutang:', err);
      showToast('✗ Gagal menghapus, coba lagi');
    }
  }

  async function handleSeed() {
    try {
      const empty = await isEmpty();
      if (!empty) {
        const ok = await confirmDialog({
          title: 'Muat Data Contoh?',
          message: 'Ini akan menggantikan seluruh data yang ada saat ini dengan data contoh. Lanjutkan?',
          confirmLabel: 'Muat',
          danger: true,
        });
        if (!ok) return;
        await clearDemoData();
      }
      await seedDemoData();
      showToast('✓ Data contoh berhasil dimuat');
    } catch (err) {
      console.error('Gagal memuat data contoh:', err);
      showToast('✗ Gagal memuat data contoh, coba lagi');
    }
  }

  async function handleClearDemo() {
    const ok = await confirmDialog({
      title: 'Hapus Semua Data?',
      message: 'Semua data akan dihapus sehingga kamu bisa mulai dari kosong dan tidak dapat dikembalikan. Lanjutkan?',
      confirmLabel: 'Hapus',
      danger: true,
    });
    if (!ok) return;
    try {
      await clearDemoData();
      showToast('✓ Data berhasil dikosongkan');
    } catch (err) {
      console.error('Gagal mengosongkan data:', err);
      showToast('✗ Gagal, coba lagi');
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Settings</h2>

      <Card className="p-4">
        <h3 className="font-medium text-slate-800 text-sm mb-3">Profil Saya</h3>
        <Label>Nama Saya</Label>
        <Select value={settings.myPersonId ?? ''} onChange={(e) => handleMyPersonChange(e.target.value)}>
          <option value="">— Belum dipilih —</option>
          {persons.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <p className="text-xs text-slate-400 mt-2">
          Menentukan siapa "Saya" agar ringkasan hutang/piutang dihitung dari sudut pandangmu.
        </p>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-medium text-slate-800 text-sm">Data</h3>
        <Button variant="secondary" className="w-full" onClick={handleExport}>
          Export Data
        </Button>
        <Button variant="secondary" className="w-full" onClick={handleImportClick}>
          Import Data
        </Button>
        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <p className="text-[11px] text-slate-400">Zona berbahaya — data yang dihapus tidak dapat dikembalikan kecuali kamu sudah export manual sebelumnya.</p>
          <Button variant="danger" className="w-full" onClick={handleDeleteAllDebts}>
            Hapus Semua Hutang
          </Button>
          <Button variant="danger" className="w-full" onClick={handleReset}>
            Reset Semua Data
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-medium text-slate-800 text-sm">Data Contoh</h3>
        <Button variant="secondary" className="w-full" onClick={handleSeed}>
          Muat Data Contoh
        </Button>
        <Button variant="ghost" className="w-full !text-red-600" onClick={handleClearDemo}>
          Kosongkan Data
        </Button>
      </Card>

      <p className="text-center text-xs text-slate-400 pt-2">Personal Debt Tracker · Data sinkron real-time via Firebase</p>
    </div>
  );
}
