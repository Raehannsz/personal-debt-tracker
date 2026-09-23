# Personal Debt Tracker

Aplikasi web pribadi untuk mencatat dan mengelola hutang/piutang antar orang. Simpel, cepat, mobile-friendly, dan tidak butuh backend — semua data tersimpan di perangkat kamu sendiri (IndexedDB).

![screenshot placeholder](./docs/screenshot.png)

## Fitur

- **Dashboard** — ringkasan total hutang, total piutang, jumlah hutang aktif, dan jatuh tempo terdekat. Semua dihitung **net** per pasangan orang secara otomatis.
- **Manajemen Orang** — tambah/edit/hapus orang, dengan pencegahan penghapusan yang merusak data (soft delete jika masih punya transaksi aktif).
- **Manajemen Hutang** — catat hutang antar siapa saja (mendukung rantai dan relasi banyak-ke-banyak, termasuk siklus), edit, batalkan, atau hapus.
- **Pembayaran Bertahap** — setiap hutang bisa dibayar beberapa kali, status otomatis berubah `ACTIVE → PARTIAL → PAID` (disimpan dalam satu transaksi atomik, jadi tidak akan ada status yang "nyangkut"). Histori pembayaran tidak pernah dihapus.
- **Netting/Kliring Otomatis** — kalau dua orang saling berhutang, otomatis dihitung selisihnya (net) di Dashboard, halaman Hutang, halaman Orang, dan visualisasi Jaringan.
- **Sinkron Real-Time Antar Perangkat** — data tersimpan di Supabase (cloud), jadi update di desktop langsung muncul di mobile (dan sebaliknya) tanpa perlu export/import manual.
- **Jaringan Hutang** — visualisasi sederhana (SVG, node & edge) untuk melihat siapa berhutang ke siapa.
- **Filter, Pencarian & Sort** — filter hutang (semua/hutang saya/piutang saya/belum lunas/lunas), pencarian berdasarkan nama, dan urutkan berdasarkan tanggal/nominal (ascending/descending).
- **Export / Import** — backup seluruh data ke file JSON dan restore kapan saja. Aksi destruktif (reset/hapus semua) otomatis membuat backup dulu sebagai jaring pengaman.
- **PWA** — bisa di-install ke home screen (Android/iOS/Desktop) dan tetap bisa dibuka saat koneksi tidak stabil.
- **Mobile First** — bottom navigation di mobile, sidebar di desktop, dioptimalkan untuk layar 360px ke atas.

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) — build tool
- [Tailwind CSS v4](https://tailwindcss.com/) — styling
- [Supabase](https://supabase.com/) — **Postgres** (database cloud real-time) + **Anonymous Authentication** untuk sinkron data antar perangkat
- [React Router](https://reactrouter.com/) (`HashRouter`, aman untuk static hosting tanpa konfigurasi rewrite)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) — manifest & service worker

Front-end sepenuhnya static (bisa di-host di GitHub Pages/Vercel/Netlify), datanya disimpan di Supabase — tidak perlu server/backend custom.

## Struktur Project

```
src/
├── components/   # Komponen UI & form modal (reusable)
├── pages/        # Halaman: Dashboard, Debts, Persons, Network, Settings, dll
├── layouts/       # Layout utama (sidebar + bottom nav)
├── hooks/        # Live-query hooks ke Supabase Realtime
├── services/     # Business logic & repository (CRUD, kalkulasi hutang)
├── lib/          # Setup Supabase client dan auth
├── types/        # TypeScript interfaces
├── utils/        # Helper (format currency, format tanggal/jam WIB)
├── stores/       # Toast & confirm dialog (state ringan, tanpa alert()/confirm())
├── data/         # Seed/demo data
└── App.tsx
```

## Setup Supabase (wajib sebelum menjalankan)

Aplikasi ini membutuhkan project Supabase gratis untuk penyimpanan dan sinkronisasi data.

1. Buka [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Buka **SQL Editor**, salin dan jalankan seluruh isi [`supabase/schema.sql`](supabase/schema.sql). File ini membuat tabel, RLS, realtime, dan RPC pembayaran atomik.
3. Buka **Authentication → Providers**, aktifkan provider **Anonymous Sign-In**.
4. Buka **Project Settings → API**, salin **Project URL** dan **Publishable/anon key**.
5. Copy `.env.example` menjadi `.env`, lalu isi:
   ```
   VITE_SUPABASE_URL=https://project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   ```
   File `.env` sudah otomatis di-gitignore, tidak akan di-commit ke GitHub.

> Catatan: gunakan publishable/anon key di frontend. Keamanan data diatur oleh RLS pada `supabase/schema.sql`; jangan pernah memasukkan `service_role` key ke aplikasi web.

## Cara Menjalankan (Development)

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`.

## Cara Build (Production)

```bash
npm run build
```

Hasil build ada di folder `dist/`. Config Supabase dari `.env` otomatis ikut ter-build ke dalamnya — pastikan `.env` sudah terisi sebelum build untuk deploy.

Untuk preview hasil build secara lokal:

```bash
npm run preview
```

## Cara Deploy

Karena tidak butuh backend, aplikasi ini bisa dideploy ke static hosting mana pun.

### Vercel / Netlify

1. Push project ke GitHub.
2. Import repo di [Vercel](https://vercel.com/) atau [Netlify](https://netlify.com/).
3. Build command: `npm run build`, Output directory: `dist`.
4. **Tambahkan environment variables** di dashboard project (Settings → Environment Variables) — isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` sesuai `.env` kamu, karena build berjalan di server mereka, bukan di komputer kamu.
5. Deploy — selesai.

### GitHub Pages

1. Push project ke GitHub.
2. Pastikan file `.env` sudah terisi di komputer kamu (build untuk GitHub Pages berjalan lokal lewat `npm run deploy`, bukan di server GitHub).
3. Jalankan `npm run deploy` (sudah otomatis build lalu push isi folder `dist/` ke branch `gh-pages`).
4. Di GitHub: repo → Settings → Pages → Source: Deploy from a branch → Branch: `gh-pages` → folder `/ (root)`.
5. Karena aplikasi menggunakan `HashRouter` dan base path relatif (`./`), tidak diperlukan konfigurasi rewrite tambahan — routing tidak akan menyebabkan 404 di subpath GitHub Pages.

## Cara Menggunakan PWA

1. Buka aplikasi di Chrome/Edge (Android/Desktop) atau Safari (iOS).
2. Pilih **"Install App"** / **"Add to Home Screen"** dari menu browser.
3. Aplikasi akan terbuka dalam mode standalone seperti aplikasi native, dan tetap bisa dibuka meski offline (data tersimpan lokal di perangkat).

## Cara Backup / Restore Data

Karena data tersimpan di cloud (Supabase) dan otomatis sinkron antar perangkat, risiko kehilangan data jauh lebih kecil dibanding penyimpanan lokal. Tapi tetap disarankan backup berkala, terutama sebelum melakukan aksi besar:

1. Buka halaman **Settings**.
2. Klik **Export Data** → file `debt-tracker-backup.json` akan terunduh (berisi semua data orang, hutang, pembayaran, dan pengaturan).
3. Untuk memulihkan: klik **Import Data**, pilih file JSON hasil export sebelumnya. Data yang ada saat ini akan digantikan dengan data dari file backup (akan diminta konfirmasi terlebih dahulu, dan backup otomatis dibuat dulu sebelum penggantian).

Aksi destruktif (**Reset Semua Data**, **Hapus Semua Hutang**) juga otomatis membuat file backup sebelum benar-benar menghapus, sebagai jaring pengaman kalau ada mis-tap.

## Menentukan "Saya"

Karena aplikasi ini pribadi, kamu perlu menentukan siapa dirimu di antara daftar orang yang dicatat, di halaman **Settings → Profil Saya**. Setelah dipilih, ringkasan **Total Hutang** dan **Total Piutang** di Dashboard akan dihitung dari sudut pandangmu.

## Data Contoh (Demo)

Saat pertama kali dibuka dengan data kosong, aplikasi otomatis mengisi beberapa data contoh (Andi, Budi, Citra, Deni beserta relasi hutangnya) agar mudah dicoba. Kamu bisa menghapus data contoh kapan saja lewat **Settings → Kosongkan Data**, atau memuatnya ulang lewat **Muat Data Contoh**.

## Lisensi

Bebas digunakan untuk keperluan pribadi.
