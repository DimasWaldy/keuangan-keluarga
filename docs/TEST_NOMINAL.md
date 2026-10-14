# Hasil tes penyimpanan nominal

Tanggal laporan: 10 Oktober 2026 (WIB).

Pengujian dilakukan lewat form `/transaksi` pada `http://localhost:3000` dengan kode lokal terbaru, login Google asli, dan proyek Supabase yang dipakai aplikasi. Pengguna menyelesaikan login sendiri. Kategori yang digunakan adalah `Tes Makan`; setiap transaksi uji diberi catatan dengan awalan `UJI NOMINAL CODEX 1791565214907`.

## Metode

1. Pilih kategori, isi nominal serta catatan uji, lalu kirim form melalui Server Action.
2. Tunggu baris transaksi muncul, muat ulang halaman, dan periksa nominal pada baris dengan catatan yang sama.
3. Kirim input tidak valid, periksa pesan error, muat ulang halaman, dan pastikan tidak ada transaksi dengan catatan uji tersebut.

Pemeriksaan ini memakai daftar yang dibaca ulang dari Supabase oleh Server Component. Nilai mentah tidak diperiksa lewat Table Editor atau kueri SQL terpisah.

## Nominal valid: semuanya lolos

| Input | Tampilan setelah reload | Hasil |
| --- | --- | --- |
| `15000` | Rp 15.000,00 | Tersimpan |
| `15.000` | Rp 15.000,00 | Tersimpan |
| `1.500.000` | Rp 1.500.000,00 | Tersimpan |
| `15000,5` | Rp 15.000,50 | Tersimpan |
| `15000,50` | Rp 15.000,50 | Tersimpan |
| `50.000` | Rp 50.000,00 | Tersimpan |

## Nominal tidak valid: semuanya ditolak

| Input | Hasil |
| --- | --- |
| `1.5` | Ditolak server; tidak muncul setelah reload |
| `50.00` | Ditolak server; tidak muncul setelah reload |
| `1,500.00` | Ditolak server; tidak muncul setelah reload |
| `abc` | Ditolak server; tidak muncul setelah reload |
| `-1` | Ditolak server; tidak muncul setelah reload |
| `0` | Ditolak server; tidak muncul setelah reload |
| `1000000000000` | Melebihi batas; ditolak server dan tidak muncul setelah reload |
| Kosong | Ditolak validasi HTML `required`; tidak muncul setelah reload |

Pesan dari server sesuai yang diminta:

> Nominal tidak valid. Contoh: 15000, 15.000, atau 15000,50 (titik untuk ribuan, koma untuk desimal).

## Bukti dan kondisi data

- [Bukti lima transaksi uji](evidence/nominal-valid-2026-10-10.jpg).
- [Bukti transaksi input 15000](evidence/nominal-15000-2026-10-10.jpg).
- [Bukti pesan penolakan](evidence/nominal-invalid-2026-10-10.jpg).

Enam transaksi uji masih tersimpan dan dapat dikenali dari awalan catatan tersebut. Tidak ada transaksi pengguna lain yang diedit atau dihapus. Screenshot baris transaksi dipotong untuk menampilkan data uji saja.

Tes berjalan saat pergantian 9 ke 10 Oktober WIB. Transaksi pertama memakai tanggal default 9 Oktober dari form yang sudah terbuka; setelah reload, form menampilkan 10 Oktober dan lima transaksi berikutnya memakai tanggal tersebut. Hal ini tidak menggantikan tes zona waktu pada deployment Vercel.

Tidak ada perubahan kode aplikasi, paket, skema, atau `.env.local` selama tes ini. Pengujian Vercel, batas pagination tepat 20/21 data, dan isolasi dua akun belum dilakukan dalam pengujian ini. Tidak ada commit, push, atau deployment.
