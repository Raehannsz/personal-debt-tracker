import { useRef, memo } from 'react'; // Hapus useMemo dari sini
import { usePersons, useSettings } from '../hooks/useData';
import { updateSettings, exportData, downloadBackup, validateBackup, importData, resetAllData } from '../services/settingsRepo';
import { deleteAllDebts } from '../services/debtRepo';
import { Card, Button, Label, Select } from '../components/ui';
import { confirmDialog } from '../stores/confirmStore';
import { showToast } from '../stores/toastStore';
import { seedDemoData, clearDemoData, isEmpty } from '../data/seed';
import type { Settings as SettingsType } from '../types'; // Import type untuk casting yang aman

const ThemeToggle = memo(function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={onToggle}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${isDark ? 'bg-indigo-600' : 'bg-slate-300'
        }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-300 ease-in-out transform-gpu ${isDark ? 'translate-x-6' : 'translate-x-1'
          }`}
      />
    </button>
  );
});

export function Settings() {
  const persons = usePersons();
  // Cast tipe agar TypeScript tahu bahwa updateSettingsLocal ada
  const settings = useSettings() as SettingsType & { updateSettingsLocal: (s: Partial<SettingsType>) => void };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDark = settings.theme === 'dark';

  async function handleMyPersonChange(id: string) {
    try {
      await updateSettings({ myPersonId: id || null });
      showToast('✓ Profil berhasil diperbarui');
    } catch (err) {
      console.error('Gagal memperbarui profil:', err);
      showToast('✗ Gagal menyimpan, coba lagi');
    }
  }

  async function handleThemeToggle() {
    const next = isDark ? 'light' : 'dark';

    // 1. Optimistic update: Langsung apply ke UI (INSTAN)
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem('theme', next);
    } catch { }

    // 2. Update state lokal TANPA memicu re-fetch loop dari Supabase
    settings.updateSettingsLocal({ theme: next });

    // 3. Fire and forget ke Supabase (tidak di-await, jadi tidak memblokir animasi)
    updateSettings({ theme: next }).catch((err) => {
      console.error('Gagal ganti tema:', err);
      showToast('✗ Gagal menyimpan tema, coba lagi');
    });

    // 4. Langsung show toast
    showToast(next === 'dark' ? '✓ Mode gelap diaktifkan' : '✓ Mode terang diaktifkan');
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

      <Card className="p-4">
        <h3 className="font-medium text-slate-800 text-sm mb-3">Tampilan</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-700">Mode Gelap</p>
            <p className="text-xs text-slate-400 mt-0.5">{isDark ? 'Aktif' : 'Nonaktif'}</p>
          </div>
          <ThemeToggle isDark={isDark} onToggle={handleThemeToggle} />
        </div>
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

      <p className="text-center text-xs text-slate-400 pt-2">Personal Debt Tracker · Data sinkron real-time via Supabase</p>
    </div>
  );
}