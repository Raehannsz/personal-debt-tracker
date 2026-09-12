import { collection, doc, getDoc, setDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Settings, BackupData } from '../types';

const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  myPersonId: null,
  theme: 'light',
};

const settingsRef = doc(db, 'meta', 'settings');

export async function getSettings(): Promise<Settings> {
  const snap = await getDoc(settingsRef);
  return snap.exists() ? (snap.data() as Settings) : DEFAULT_SETTINGS;
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const updated = { ...current, ...patch, id: 'settings' as const };
  await setDoc(settingsRef, updated);
  return updated;
}

export async function exportData(): Promise<BackupData> {
  const [personsSnap, debtsSnap, paymentsSnap, settings] = await Promise.all([
    getDocs(collection(db, 'persons')),
    getDocs(collection(db, 'debts')),
    getDocs(collection(db, 'payments')),
    getSettings(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    persons: personsSnap.docs.map((d) => d.data()) as BackupData['persons'],
    debts: debtsSnap.docs.map((d) => d.data()) as BackupData['debts'],
    payments: paymentsSnap.docs.map((d) => d.data()) as BackupData['payments'],
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

async function clearCollection(name: string): Promise<void> {
  const snap = await getDocs(collection(db, name));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function importData(data: BackupData): Promise<void> {
  await Promise.all([clearCollection('persons'), clearCollection('debts'), clearCollection('payments')]);

  const batch = writeBatch(db);
  data.persons.forEach((p) => batch.set(doc(db, 'persons', p.id), p));
  data.debts.forEach((d) => batch.set(doc(db, 'debts', d.id), d));
  data.payments.forEach((p) => batch.set(doc(db, 'payments', p.id), p));
  batch.set(settingsRef, { ...data.settings, id: 'settings' });
  await batch.commit();
}

export async function resetAllData(): Promise<void> {
  await Promise.all([
    clearCollection('persons'),
    clearCollection('debts'),
    clearCollection('payments'),
    deleteDoc(settingsRef),
  ]);
}
