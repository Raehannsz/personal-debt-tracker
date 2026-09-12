import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { initializeFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// PENTING: ignoreUndefinedProperties diaktifkan karena field opsional di aplikasi ini
// (nomor telepon, email, catatan, deskripsi, dll) sering bernilai `undefined` saat dikosongkan.
// Firestore secara default MENOLAK menyimpan dokumen yang punya field `undefined` (error
// "Unsupported field value: undefined") — opsi ini bikin field seperti itu otomatis dilewati
// saat disimpan, alih-alih membuat seluruh operasi simpan gagal.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

// Simpan cache lokal di IndexedDB juga (lewat SDK Firestore) supaya aplikasi tetap bisa
// dibuka & dipakai saat offline, dan otomatis sinkron lagi begitu online.
enableIndexedDbPersistence(db).catch((err) => {
  // Gagal biasanya karena tab lain sudah pegang lock (multi-tab) — aplikasi tetap jalan,
  // cuma persistence offline-nya tidak aktif di tab ini.
  console.warn('IndexedDB persistence tidak aktif:', err.code);
});

/**
 * Login anonim otomatis. Tidak perlu akun/password — tiap perangkat dapat identitas
 * anonim sendiri, dipakai Firestore security rules untuk membatasi akses hanya untuk
 * pengguna yang sudah login (bukan sepenuhnya publik).
 */
export function ensureSignedIn(): Promise<void> {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        unsub();
        if (user) {
          resolve();
        } else {
          signInAnonymously(auth).then(() => resolve()).catch(reject);
        }
      },
      reject
    );
  });
}

export function genId(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}
