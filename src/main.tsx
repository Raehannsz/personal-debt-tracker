import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ensureSignedIn } from './lib/supabase'

const root = createRoot(document.getElementById('root')!)

// Login anonim dulu sebelum mengakses data Supabase.
// Kalau lagi offline & belum pernah login sebelumnya di perangkat ini, tetap lanjut render
// supaya aplikasi tidak macet total — data akan otomatis sinkron begitu online.
ensureSignedIn()
  .then(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch((err) => {
    console.error('Gagal login anonim:', err);
    const message = err instanceof Error ? err.message : 'Gagal login ke Supabase.';
    root.render(
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-lg space-y-3 rounded-xl bg-white p-6 shadow-sm">
          <h1 className="font-semibold text-slate-800">Supabase belum siap</h1>
          <p className="text-sm text-slate-600">Aktifkan Anonymous Sign-In di Supabase Authentication, lalu muat ulang halaman.</p>
          <p className="break-words rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{message}</p>
        </div>
      </div>,
    );
  })
