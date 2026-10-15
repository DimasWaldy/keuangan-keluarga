# Blueprint: Keuangan Keluarga

Aplikasi web untuk mencatat pemasukan dan pengeluaran keluarga, dikelompokkan per kategori, dengan ringkasan bulanan dan (nanti) input transaksi dari screenshot lewat OCR.

**Tujuan proyek ini adalah portofolio** untuk melamar magang, kerja, atau freelance. Yang dinilai pembaca: situs yang bisa dicoba tanpa login, README yang rapi, keputusan keamanan yang bisa dijelaskan, dan bukti pengujian. Aturan kerja ada di `AGENTS.md`.

## Keputusan

| Aspek    | Keputusan                                                                                | Alasan                                                             |
| -------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind. `app/` dan `utils/` di root, tanpa `src/` | Stack yang dicari lowongan; berbeda dari proyek Laravel sebelumnya |
| Backend  | Supabase: Postgres, Auth (Google OAuth), Row Level Security                              | Login dan isolasi data tidak dibuat dari nol                       |
| Hosting  | Vercel (gratis), URL `*.vercel.app`                                                      | Domain sendiri bisa menyusul                                       |
| OCR      | Gemini Vision, dipanggil dari server                                                     | API key tidak pernah sampai ke browser                             |
| Uang     | `numeric(14,2)`, dikirim sebagai string desimal                                          | Menghindari galat pembulatan float                                 |
| Tanggal  | Zona Asia/Jakarta; aplikasi selalu mengirim `occurred_on`                                | Server Vercel dan database memakai UTC                             |
| Data     | Terpisah per akun. Berbagi data keluarga ditunda                                         | Perlu model `households` tersendiri                                |

## Fase dan status

| Fase                      | Isi                                                        | Status                                                            |
| ------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- | --- |
| 0. Fondasi                | Login Google, dashboard terlindungi, logout, deploy Vercel | Selesai: lolos di localhost dan Vercel                            |
| 1. Kategori dan transaksi | CRUD kategori, tambah/daftar/hapus transaksi, RLS          | Selesai: semua tes lolos di localhost dan Vercel                  |
| 2. Ringkasan bulanan      | Total pemasukan, pengeluaran, dan selisih per bulan        | Selesai: fungsi SQL + UI, angka cocok hitungan manual             |
| 3. Mode demo              | Tombol "Coba Demo" tanpa login                             | Selesai: MVP lolos di localhost dan Vercel                        |
| 4. OCR                    | Screenshot transaksi, konfirmasi, simpan                   | Selesai: alur end-to-end, batas harian, retry 503, anonim ditolak |
| 5. Poles                  | README, ERD, diagram, catatan keamanan, bukti tes          | Selesai: README, ERD, SECURITY.md, diagram Mermaid, screenshot    |     |
| 6. Redesign UI            | Tema gelap/terang, palette hijau, polish halaman           | Selesai                                                           |
| 7. Fitur tambahan         | Filter bulan, edit transaksi, export CSV, grafik kategori  | Selesai                                                           |

Fase 3 sengaja sebelum OCR: login Google masih mode Testing, jadi rekruter belum bisa masuk tanpa mode demo.

## Pemeriksaan penerimaan

Centang hanya setelah dicoba di aplikasi dengan Supabase asli.

**Fase 1**

- [x] Tambah kategori: tampil di kelompoknya, `user_id` terisi otomatis di database
- [x] Hapus kategori yang dipakai transaksi: muncul "Kategori masih dipakai transaksi"
- [x] Tanggal 31 Februari ditolak
- [x] Nominal `15000`, `15.000`, `1.500.000`, `15.000,50` tersimpan benar; `1.5`, `50.00`, `1,500.00` ditolak dengan pesan jelas
- [x] Kategori duplikat: muncul "Kategori itu sudah ada"
- [x] Transaksi dibuat antara 00:00 dan 07:00 WIB (diuji di URL Vercel) tersimpan dengan tanggal WIB hari itu
- [x] Pagination: tepat 20 transaksi tanpa halaman 2; 21 transaksi, halaman 2 berisi 1
- [x] Dua akun: tiap akun hanya melihat datanya sendiri; kategori akun lain tidak muncul di dropdown
- [x] Pemalsuan: mengubah `category_id` di form menjadi milik akun lain ditolak
- [x] `/kategori` dan `/transaksi` tanpa login diarahkan ke `/login`

**Fase 2**

- [x] `db/002_ringkasan_bulanan.sql` dijalankan di Supabase; `anon` tidak punya hak execute
- [x] `/dashboard?bulan=YYYY-MM` menampilkan angka yang sama dengan hitungan manual
- [x] Bulan tanpa transaksi menampilkan keadaan kosong, bukan error

**Fase 3**

- [x] Tombol "Coba Demo" di /login membuat akun anonim dan langsung masuk dashboard
- [x] Dashboard menampilkan "Mode demo" (bukan email kosong) untuk akun anonim
- [x] Data contoh muncul: 3 kategori (Gaji, Makan, Transportasi) dan 6 transaksi
- [x] Klik "Coba Demo" dua kali di jendela incognito berbeda menghasilkan akun terpisah
- [x] Akun anonim tidak bisa melihat data akun Google/anonim lain

**Fase 4**

- [x] Upload gambar JPG/PNG/WebP maks 2 MB ke /ocr
- [x] Gemini mengekstrak transaksi dan mengembalikan JSON terstruktur
- [x] Hasil tampil sebagai form yang bisa diedit (nominal, tanggal, kategori, catatan)
- [x] Kategori auto-select berdasarkan category_hint dari Gemini
- [x] Checkbox per transaksi; yang tidak dicentang tidak disimpan
- [x] Simpan menulis ke tabel transactions; muncul di /transaksi dan /dashboard
- [x] ocr_logs hanya bertambah saat OCR berhasil (bukan saat gagal)
- [x] Batas harian 10/user dites sampai kena limit
- [x] Retry otomatis saat Gemini 503 (high demand)
- [x] Mode demo dibatasi ke screenshot contoh (bukan upload bebas)

**Fase 5**

- [x] README dengan link demo, fitur, stack, cara setup, dan keputusan keamanan
- [x] ERD dan diagram alur aplikasi (Mermaid, render di GitHub)
- [x] docs/SECURITY.md: keputusan keamanan + daftar yang BELUM ada
- [x] Screenshot dashboard dan transaksi di README
- [x] Repo GitHub public
- [ ] Screenshot OCR sukses (placeholder, ditambah nanti)

**Fase 6: redesign UI**

- [x] Palette hijau emerald + abu gelap, dengan mode terang
- [x] Theme toggle (system / light / dark) di dashboard dan login
- [x] Pilihan theme tersimpan di localStorage, ikut OS default
- [x] Redesign halaman login, dashboard, kategori, transaksi, OCR
- [x] Screenshot README diperbarui dengan tampilan baru
- [ ] Animasi slide/hover halus di kartu dan tombol

**Fase 7: fitur tambahan**

- [x] Filter bulan di halaman /transaksi
- [x] Edit transaksi (inline form)
- [x] Export transaksi ke CSV (comma-separated, kompatibel Excel Indonesia)
- [x] Grafik pengeluaran per kategori di dashboard (SVG custom, tanpa library)
- [x] Search bar di /transaksi (cari di catatan)

## Rencana fase berikutnya

**Fase 2: ringkasan bulanan.** Dihitung lewat fungsi SQL `monthly_summary`, bukan dengan menjumlah di aplikasi: API membatasi jumlah baris per permintaan (default 1000, cek di Settings, API), jadi total di aplikasi bisa diam-diam salah. Selisih adalah pemasukan dikurangi pengeluaran yang tercatat, bukan saldo bank.

**Fase 3: mode demo.** Rencana: Supabase Anonymous Sign-ins. Tiap pengunjung mendapat akun sementara sendiri, jadi RLS memisahkan datanya otomatis dan tidak ada kredensial bersama. Data contoh diisi lewat fungsi SQL `seed_demo_data()` (security invoker). Perlu: batas jumlah baris per akun, pembersihan akun anonim lama, perlindungan CAPTCHA, OCR dinonaktifkan atau dibatasi di mode demo. Ketersediaan, batas, dan syarat fitur ini di paket gratis perlu diverifikasi di dokumentasi Supabase sebelum dikerjakan.

**Fase 4: OCR.** Gemini dipanggil dari Server Action atau Route Handler, kunci di `GEMINI_API_KEY` (tanpa `NEXT_PUBLIC_`). Gambar diproses lalu dibuang. Hasil divalidasi dengan skema, ditampilkan di layar konfirmasi, dan baru disimpan lewat jalur transaksi biasa. Batas pemakaian per akun per hari dan global per hari, plus batas ukuran dan tipe file. Data finansial dikirim ke Google; kebijakan tier gratis perlu diverifikasi dan dicatat di README.

**Fase 5: poles.** README dengan tangkapan layar atau GIF dan link demo, ERD, diagram arsitektur, catatan keamanan (RLS, foreign key gabungan, alasan tidak memakai `SECURITY DEFINER`), hasil pengujian, lalu repo dijadikan public.

## Di luar cakupan sekarang

Edit transaksi, anggaran, impor/ekspor, berbagi data antar anggota keluarga.

## Daftar perkuatan (setelah fitur inti)

- Batas jumlah baris per akun lewat trigger, supaya kuota database gratis tidak habis oleh penyalahgunaan. Kunci publik membuat API bisa dipanggil langsung tanpa melewati aplikasi.
- Nama kategori unik tanpa membedakan huruf besar/kecil.
- Batas rentang tanggal yang wajar di database.
- Uji skema dan RLS otomatis di Postgres lokal (PGlite), disimpan di `db/tests/`.
- Cek anonim pakai `user.is_anonymous === true || !user.email`. Kalau nanti
  nambah provider login lain (GitHub, email/password), ganti jadi cek
  `is_anonymous` saja supaya tidak false-positive.
- Batas ukuran file 2 MB (naik jadi 4 MB kalau butuh). Server Action
  bodySizeLimit di next.config.ts diset 3 MB.

## Privasi & OCR

Fitur OCR memakai Gemini API dengan tier gratis. Google dapat menggunakan
data yang dikirim ke tier gratis untuk meningkatkan model mereka. **Jangan
unggah screenshot berisi data finansial asli di mode demo ini.**

Di produksi sesungguhnya, aplikasi wajib memakai tier berbayar Gemini (data
tidak dipakai untuk training) atau penyedia OCR lain dengan perjanjian
perlindungan data yang jelas.
