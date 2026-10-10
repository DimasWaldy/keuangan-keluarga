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

| Fase                      | Isi                                                        | Status                                                                           |
| ------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 0. Fondasi                | Login Google, dashboard terlindungi, logout, deploy Vercel | Selesai: lolos di localhost dan Vercel                                           |
| 1. Kategori dan transaksi | CRUD kategori, tambah/daftar/hapus transaksi, RLS          | Kode jadi, tes lokal lolos. Sisa: perbaikan format nominal, tes dua akun, deploy |
| 2. Ringkasan bulanan      | Total pemasukan, pengeluaran, dan selisih per bulan        | SQL siap (`db/002`). UI belum                                                    |
| 3. Mode demo              | Tombol "Coba Demo" tanpa login                             | Belum                                                                            |
| 4. OCR                    | Screenshot transaksi, konfirmasi, simpan                   | Belum                                                                            |
| 5. Poles                  | README, ERD, diagram, catatan keamanan, bukti tes          | Belum                                                                            |

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
- [ ] Pemalsuan: mengubah `category_id` di form menjadi milik akun lain ditolak
- [x] `/kategori` dan `/transaksi` tanpa login diarahkan ke `/login`

**Fase 2**

- [x] `db/002_ringkasan_bulanan.sql` dijalankan di Supabase; `anon` tidak punya hak execute
- [ ] `/dashboard?bulan=YYYY-MM` menampilkan angka yang sama dengan hitungan manual
- [ ] Bulan tanpa transaksi menampilkan keadaan kosong, bukan error

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
