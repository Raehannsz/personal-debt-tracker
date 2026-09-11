# Personal Debt Tracker

Aplikasi web pribadi untuk mencatat dan mengelola hutang/piutang antar orang. Simpel, cepat, mobile-friendly, dan tidak butuh backend — semua data tersimpan di perangkat kamu sendiri (IndexedDB).

![screenshot placeholder](./docs/screenshot.png)

## Fitur

- **Dashboard** — ringkasan total hutang, total piutang, jumlah hutang aktif, dan jatuh tempo terdekat.
- **Manajemen Orang** — tambah/edit/hapus orang, dengan pencegahan penghapusan yang merusak data (soft delete jika masih punya transaksi aktif).
- **Manajemen Hutang** — catat hutang antar siapa saja (mendukung rantai dan relasi banyak-ke-banyak, termasuk siklus), edit, batalkan, atau hapus.
- **Pembayaran Bertahap** — setiap hutang bisa dibayar beberapa kali, status otomatis berubah `ACTIVE → PARTIAL → PAID`. Histori pembayaran tidak pernah dihapus.
- **Jaringan Hutang** — visualisasi sederhana (SVG, node & edge) untuk melihat siapa berhutang ke siapa.
- **Filter & Pencarian** — filter hutang (semua/hutang saya/piutang saya/belum lunas/lunas) dan pencarian berdasarkan nama.
- **Export / Import** — backup seluruh data ke file JSON dan restore kapan saja.
- **PWA** — bisa di-install ke home screen (Android/iOS/Desktop) dan tetap bisa dibuka secara offline.
- **Mobile First** — bottom navigation di mobile, sidebar di desktop, dioptimalkan untuk layar 360px ke atas.

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) — build tool
- [Tailwind CSS v4](https://tailwindcss.com/) — styling
- [Dexie.js](https://dexie.org/) + `dexie-react-hooks` — wrapper IndexedDB yang ringan dan reaktif
- [React Router](https://reactrouter.com/) (`HashRouter`, aman untuk static hosting tanpa konfigurasi rewrite)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) — manifest & service worker

Tidak ada backend/server — 100% berjalan di browser.

## Struktur Project

```
src/
├── components/   # Komponen UI & form modal (reusable)
├── pages/        # Halaman: Dashboard, Debts, Persons, Network, Settings, dll
├── layouts/       # Layout utama (sidebar + bottom nav)
├── hooks/        # Live-query hooks ke IndexedDB (dexie-react-hooks)
├── services/     # Business logic & repository (CRUD, kalkulasi hutang)
├── lib/          # Setup database (Dexie)
├── types/        # TypeScript interfaces
├── utils/        # Helper (format currency, format tanggal)
├── stores/       # Toast & confirm dialog (state ringan, tanpa alert()/confirm())
├── data/         # Seed/demo data
└── App.tsx
```

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

Hasil build ada di folder `dist/`. Build sudah diverifikasi bebas error TypeScript.

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
4. Deploy — selesai.

### GitHub Pages

1. Push project ke GitHub.
2. Jalankan `npm run build`.
3. Deploy isi folder `dist/` ke branch `gh-pages` (bisa pakai [`gh-pages` package](https://www.npmjs.com/package/gh-pages) atau GitHub Actions).
4. Karena aplikasi menggunakan `HashRouter` dan base path relatif (`./`), tidak diperlukan konfigurasi rewrite tambahan — routing tidak akan menyebabkan 404 di subpath GitHub Pages.

## Cara Menggunakan PWA

1. Buka aplikasi di Chrome/Edge (Android/Desktop) atau Safari (iOS).
2. Pilih **"Install App"** / **"Add to Home Screen"** dari menu browser.
3. Aplikasi akan terbuka dalam mode standalone seperti aplikasi native, dan tetap bisa dibuka meski offline (data tersimpan lokal di perangkat).

## Cara Backup / Restore Data

Karena semua data tersimpan secara lokal (IndexedDB) di browser/perangkat kamu, **selalu backup secara berkala**, terutama sebelum membersihkan cache browser atau berganti perangkat:

1. Buka halaman **Settings**.
2. Klik **Export Data** → file `debt-tracker-backup.json` akan terunduh (berisi semua data orang, hutang, pembayaran, dan pengaturan).
3. Untuk memulihkan: klik **Import Data**, pilih file JSON hasil export sebelumnya. Data yang ada saat ini akan digantikan dengan data dari file backup (akan diminta konfirmasi terlebih dahulu).

## Menentukan "Saya"

Karena aplikasi ini pribadi, kamu perlu menentukan siapa dirimu di antara daftar orang yang dicatat, di halaman **Settings → Profil Saya**. Setelah dipilih, ringkasan **Total Hutang** dan **Total Piutang** di Dashboard akan dihitung dari sudut pandangmu.

## Data Contoh (Demo)

Saat pertama kali dibuka dengan data kosong, aplikasi otomatis mengisi beberapa data contoh (Andi, Budi, Citra, Deni beserta relasi hutangnya) agar mudah dicoba. Kamu bisa menghapus data contoh kapan saja lewat **Settings → Kosongkan Data**, atau memuatnya ulang lewat **Muat Data Contoh**.

## Lisensi

Bebas digunakan untuk keperluan pribadi.
