# Panduan Hosting ke Cloudflare (Gratis)

Folder ini berisi kode backend baru untuk menggantikan PHP/MySQL dengan Cloudflare Workers dan D1 Database (Gratis).

## Persiapan
1.  **Node.js**: Pastikan sudah install Node.js di komputer Anda.
2.  **Akun Cloudflare**: Daftar gratis di [cloudflare.com](https://dash.cloudflare.com).

## Langkah-langkah Install

Lakukan langkah ini di **Terminal** (CMD atau PowerShell) di dalam folder `cloudflare_worker`.

### 1. Install Wrangler
Wrangler adalah alat untuk upload ke Cloudflare. Ketik:
```bash
npm install -g wrangler
```

### 2. Login ke Cloudflare
Ketik perintah ini, lalu browser akan terbuka otomatis. Login dan klik "Allow".
```bash
wrangler login
```

### 3. Buat Database
Kita perlu membuat database online. Ketik:
```bash
wrangler d1 create latranshop-db
```
**PENTING**: Setelah perintah ini sukses, cari tulisan `database_id` di layat! Copy ID tersebut (bentuknya panjang seperti `a1b2c3d4-...`).

### 4. Masukkan ID ke Config
Buka file `wrangler.toml` yang ada di folder ini.
Ganti tulisan `REPLACE_WITH_YOUR_DATABASE_ID` dengan ID yang tadi Anda copy. Simpan file.

### 5. Buat Struktur Tabel
Jalankan perintah ini untuk membuat tabel database secara online:
```bash
wrangler d1 execute latranshop-db --file=./schema.sql
```

### 6. Upload (Deploy)
Agar bisa diakses semua orang, upload worker ini ke internet:
```bash
wrangler deploy
```
Tunggu sampai selesai. Copy **Worker URL** yang muncul di akhir (biasanya berakhiran `.workers.dev`).
Contoh: `https://latranshop-api.nama-anda.workers.dev`

### 7. Buat User Admin
Buka browser (Chrome/Edge), lalu akses URL worker Anda tadi ditambah `/api/auth.php?action=init`.
Contoh:
`https://url-worker-anda.workers.dev/api/auth.php?action=init`

Jika sukses, akan muncul tulisan JSON bahwa admin berhasil dibuat.

### 8. Sambungkan Website
Kembali ke folder utama project website.
Buka file `js/api-client.js`.
Cari baris `BASE_URL` dan ganti dengan URL worker Anda tadi.

```javascript
// Ganti yang lama
// BASE_URL: 'http://localhost/latranshop/api', 

// Isi dengan URL baru Anda
BASE_URL: 'https://url-worker-anda.workers.dev/api',
```

Selesai! Sekarang website Anda menggunakan database online dan bisa dibuka dari mana saja (selama file HTML/JS-nya juga di-hosting atau dibuka lokal tapi connect ke internet).

## Catatan Gambar
Versi gratis ini menyimpan gambar kecil langsung di database. Jika gambar terlalu besar, mungkin akan gagal upload. Untuk penggunaan berat, disarankan upgrade ke Cloudflare R2 (tapi itu tahap lanjut).
