import { db } from '../lib/db';
import type { Settings, BackupData } from '../types';

const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  myPersonId: null,
  theme: 'light',
};

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('settings');
  return s ?? DEFAULT_SETTINGS;
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const updated = { ...current, ...patch, id: 'settings' as const };
  await db.settings.put(updated);
  return updated;
}

export async function exportData(): Promise<BackupData> {
  const [persons, debts, payments, settings] = await Promise.all([
    db.persons.toArray(),
    db.debts.toArray(),
    db.payments.toArray(),
    getSettings(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    persons,
    debts,
    payments,
    settings,
  };
}

export function downloadBackup(data: BackupData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'debt-tracker-backup.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function validateBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    Array.isArray(d.persons) &&
    Array.isArray(d.debts) &&
    Array.isArray(d.payments) &&
    typeof d.settings === 'object' &&
    d.settings !== null
  );
}

export async function importData(data: BackupData): Promise<void> {
  await db.transaction('rw', db.persons, db.debts, db.payments, db.settings, async () => {
    await db.persons.clear();
    await db.debts.clear();
    await db.payments.clear();
    await db.settings.clear();
    await db.persons.bulkAdd(data.persons);
    await db.debts.bulkAdd(data.debts);
    await db.payments.bulkAdd(data.payments);
    await db.settings.put({ ...data.settings, id: 'settings' });
  });
}

export async function resetAllData(): Promise<void> {
  await db.transaction('rw', db.persons, db.debts, db.payments, db.settings, async () => {
    await db.persons.clear();
    await db.debts.clear();
    await db.payments.clear();
    await db.settings.clear();
  });
}
