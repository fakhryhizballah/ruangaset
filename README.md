# RuangAset — Production-oriented asset tracking app

RuangAset adalah aplikasi full-stack berbasis **Next.js + Express 5 + MongoDB/Mongoose**. UI terhubung ke API dan membaca/menulis database. Tidak ada data demo bawaan; data yang muncul berasal dari MongoDB.

## Fitur

- Login dan registrasi viewer; role admin/staff/viewer.
- Admin dapat mengubah role atau menonaktifkan akun di menu **Pengguna**.
- Dashboard jumlah aset, lokasi, jenis, distribusi kondisi, dan aktivitas terbaru.
- CRUD aset dengan ID QR unik, jenis aset, lokasi, kondisi, parameter manual, catatan, dan riwayat perubahan.
- Scan QR dengan kamera browser yang mendukung `BarcodeDetector`; ID dapat dimasukkan manual sebagai fallback.
- CRUD **Lokasi** dan **Jenis aset**. Lokasi/jenis yang masih dipakai tidak dapat dihapus.
- Tautan publik per lokasi harus diaktifkan oleh pengguna berizin. Endpoint publik hanya mengeluarkan allowlist field dan tidak membagikan catatan atau parameter manual.
- Filter/search dan pagination daftar aset; ekspor XLSX asli hingga 10.000 baris per file.
- JWT akses RSA (RS256), refresh token acak yang dirotasi dan di-hash di database, cookie HttpOnly, bcrypt, Helmet, CORS allowlist, rate limit, validasi Zod, dan graceful shutdown.
- Indeks MongoDB untuk ID unik dan kueri inventaris.

## Persyaratan

Gunakan **Node.js 24 LTS atau lebih baru**. Pada tanggal pembuatan README, Node.js 24 tersedia pada jalur LTS resmi. Versi dependency disimpan pada `package.json`; jalankan `npm install` di root untuk menginstal seluruh workspace.

## Setup lokal

1. Buat environment backend dan pasangan kunci RSA:

   ```bash
   npm install
   npm run setup:env
   ```

   Perintah ini membuat `backend/.env` secara lokal dan **tidak menimpa** file bila sudah ada. File tersebut masuk `.gitignore`.

2. Edit `backend/.env`. Isi setidaknya `MONGODB_URI` dan `SEED_ADMIN_PASSWORD`. Password admin harus 12–72 byte dan gunakan password kuat yang unik. Contoh URI lokal:

   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/ruangaset
   SEED_ADMIN_EMAIL=admin@domain-anda.id
   SEED_ADMIN_PASSWORD=GANTI_DENGAN_PASSWORD_KUAT_12_KARAKTER_MINIMUM
   CORS_ORIGINS=http://localhost:3000
   ```

   Jika memakai MongoDB Atlas, gunakan connection string Atlas, buat user database dengan hak minimum yang dibutuhkan, dan atur network access/IP allowlist pada Atlas. Jangan masukkan kredensial nyata ke repository atau kirimkannya di chat.

3. Siapkan database dan akun admin pertama:

   ```bash
   npm run db:indexes
   npm run seed:admin
   ```

   `seed:admin` hanya membuat akun baru. Jika email telah ada, skrip tidak menimpa akun atau password yang ada. Tidak ada aset/lokasi/jenis palsu yang dibuat otomatis.

4. Siapkan URL API frontend dalam `frontend/.env.local` (opsional untuk lokal karena ada fallback):

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000/api
   ```

5. Jalankan frontend dan backend:

   ```bash
   npm run dev
   ```

   Buka `http://localhost:3000`. Backend API ada di `http://localhost:4000`; health check tersedia di `/healthz`.

## Konfigurasi `.env` backend

| Variable | Keterangan |
|---|---|
| `NODE_ENV` | Gunakan `production` saat deployment. |
| `PORT` | Port Express, default 4000. |
| `MONGODB_URI` | URI MongoDB. Wajib diisi. |
| `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY` | Kunci RSA PEM dibuat oleh `npm run setup:env`. Jangan unggah private key. |
| `JWT_ACCESS_TTL` | Masa hidup access token, default `15m`. |
| `REFRESH_TOKEN_DAYS` | Masa hidup refresh token, default 30 hari. |
| `CORS_ORIGINS` | Daftar origin frontend lengkap dipisahkan koma, tanpa wildcard. |
| `COOKIE_SAME_SITE` | `lax` untuk frontend/backend satu site; `none` hanya jika lintas site dan selalu melalui HTTPS. |
| `COOKIE_DOMAIN` | Opsional, hanya set bila kebijakan domain cookie memang memerlukannya. |
| `REGISTER_ENABLED` | `true` untuk pendaftaran yang hanya mendapat role viewer; `false` untuk mematikan pendaftaran publik. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Dipakai oleh skrip bootstrap admin, bukan oleh request web. |

`frontend/.env.example` berisi `NEXT_PUBLIC_API_URL`. Untuk frontend Next.js, URL publik API menjadi bagian bundle saat build; pastikan nilainya benar sebelum menjalankan `npm run build` atau membangun image Docker.

## Production deployment

1. Siapkan MongoDB Atlas/managed MongoDB, TLS, database user dengan password kuat, backup terjadwal, serta allowlist jaringan.
2. Deploy backend dan frontend sebagai layanan terpisah. Set `NODE_ENV=production`, `MONGODB_URI`, pasangan kunci RSA, `CORS_ORIGINS` yang tepat, dan rahasia lain pada secret manager platform deployment—bukan pada repository.
3. Frontend dan API idealnya berada di subdomain milik site yang sama (misalnya `app.example.com` dan `api.example.com`) dengan HTTPS. Dalam setup ini cookie `SameSite=Lax` umumnya sesuai. Jika benar-benar lintas site, gunakan `COOKIE_SAME_SITE=none` hanya bersama HTTPS/secure cookie dan pertahankan CORS allowlist yang ketat.
4. Jalankan `npm run db:indexes` sebagai langkah rilis/migrasi sebelum menerima trafik; jalankan `npm run seed:admin` satu kali untuk bootstrap akun admin.
5. Build frontend dengan nilai `NEXT_PUBLIC_API_URL` produksi, lalu jalankan `npm run build`. Jalankan layanan menggunakan `npm run start` (atau image Docker di folder masing-masing). Gunakan health check backend `/healthz`.
6. Verifikasi alur backup/restore, alerting, log, TLS termination, pembatasan akses jaringan database, dan kebijakan retensi sebelum memasukkan data sensitif.

### Docker

`docker-compose.yml` disediakan **untuk pengembangan lokal saja** (MongoDB tanpa autentikasi hanya di-bind ke loopback). Buat `backend/.env` terlebih dahulu dengan `npm run setup:env`. Perintah `docker compose up --build` memulai frontend/API/MongoDB lokal. Jangan gunakan konfigurasi MongoDB lokal pada compose tersebut sebagai deployment produksi.

Untuk Docker produksi terpisah:

- Build API dari folder `backend/`, lalu inject environment secrets melalui orchestrator.
- Build frontend dari folder `frontend/` dan berikan build arg `NEXT_PUBLIC_API_URL=https://api.domain-anda.id/api`.
- Atur `CORS_ORIGINS` di backend ke origin frontend produksi yang sesungguhnya.

## Endpoint inti

Semua path di bawah berada di bawah `/api` kecuali dinyatakan lain. Endpoint selain login/register/refresh/logout, health check, dan endpoint aset publik memerlukan `Authorization: Bearer <accessToken>`.

| Method | Endpoint | Keterangan |
|---|---|---|
| `POST` | `/auth/register` | Registrasi viewer (bisa dinonaktifkan). |
| `POST` | `/auth/login` | Login; access token di response, refresh token di cookie HttpOnly. |
| `POST` | `/auth/refresh` | Rotasi refresh token dan terbitkan access token baru. |
| `POST` | `/auth/logout` | Cabut refresh token dan hapus cookie. |
| `GET` | `/auth/me` | Profil sesi. |
| `GET/POST` | `/assets` | Daftar/filter aset dan buat aset (admin/staff untuk tulis). |
| `GET/PATCH/DELETE` | `/assets/:id` | Baca/perbarui aset; hapus hanya admin. |
| `GET` | `/assets/:id/history` | Riwayat aset. |
| `GET` | `/assets/history` | Riwayat aktivitas global. |
| `GET` | `/assets/export.xlsx` | Ekspor XLSX dengan filter yang sama. |
| `GET` | `/assets/public/:locationId` | Hanya data publik jika tautan lokasi aktif. |
| `GET/POST` | `/locations` | Daftar dan tambah lokasi. |
| `PATCH/DELETE` | `/locations/:id` | Perbarui/hapus lokasi (hapus admin saja, tidak boleh jika masih digunakan). |
| `GET/POST` | `/asset-types` | Daftar dan tambah jenis aset. |
| `PATCH/DELETE` | `/asset-types/:id` | Perbarui/hapus jenis (hapus admin saja, tidak boleh jika masih digunakan). |
| `GET` | `/users` | Daftar akun, admin saja. |
| `PATCH` | `/users/:id` | Ubah role/status akun, admin saja. |
| `GET` | `/dashboard/stats` | Statistik dari MongoDB. |
| `GET` | `/healthz` | Health check tanpa autentikasi. |

## Batasan dan checklist sebelum go-live

- Kode ini adalah baseline produksi yang perlu dikonfigurasi dan di-deploy di lingkungan Anda; belum terhubung ke MongoDB Anda dan **belum di-deploy ke internet** karena URI database, domain, dan kredensial deployment harus berasal dari pemilik sistem.
- Instalasi dependency dan build framework perlu dijalankan di lingkungan deployment Anda. Pemeriksaan sintaks source dilakukan saat penyusunan; instalasi dependency pada lingkungan pembuat file tidak selesai karena permintaan ke package registry timeout.
- Belum ada pengiriman email/OTP, reset password mandiri, verifikasi email, MFA, soft-delete/retensi aset, atau monitoring eksternal. Tentukan kebijakan tersebut sesuai kebutuhan organisasi sebelum go-live.
- Jika memakai lintas domain, uji perilaku cookie pada browser yang dipakai serta lakukan review CSRF dan security deployment; jangan sekadar mengaktifkan `SameSite=None` tanpa HTTPS dan CORS ketat.
- Tetapkan mekanisme rotasi RSA key, pengelolaan secrets, backup/restore, alerting, audit log operasional, dan uji beban sesuai kebutuhan organisasi.
