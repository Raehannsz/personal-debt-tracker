import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ensureSignedIn } from './lib/firebase'

const root = createRoot(document.getElementById('root')!)

// Login anonim dulu (dibutuhkan Firestore security rules) sebelum render halaman.
// Kalau lagi offline & belum pernah login sebelumnya di perangkat ini, tetap lanjut render
// supaya aplikasi tidak macet total — data akan otomatis sinkron begitu online.
ensureSignedIn()
  .catch((err) => console.error('Gagal login anonim:', err))
  .finally(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
