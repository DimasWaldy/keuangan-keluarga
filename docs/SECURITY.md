# Catatan Keamanan

Dokumen ini menjelaskan keputusan keamanan utama proyek My Money Money dan hal yang belum diimplementasikan. Penjelasan didasarkan pada kode serta migrasi SQL dalam repositori; konfigurasi layanan produksi tidak diaudit ulang saat dokumen ini disusun. Untuk aturan kerja harian, lihat [AGENTS.md](../AGENTS.md).

## Autentikasi

- Login Google menggunakan Supabase Auth melalui OAuth 2.0. Aplikasi tidak menerima atau menyimpan password Google.
- Setiap Server Action yang mengakses data pengguna, termasuk kedua action OCR dan action keluar, memanggil `supabase.auth.getUser()` sendiri. Pemeriksaan tidak bergantung pada halaman yang menampilkan form, karena action dapat dipanggil langsung. `getUser()` menghubungi server Supabase Auth untuk memperoleh identitas yang tervalidasi; `getSession()` membaca penyimpanan sesi yang, pada SSR, berasal dari cookie request dan tidak boleh dijadikan dasar otorisasi tanpa verifikasi. Metode tersebut dapat memperbarui sesi, tetapi tidak menggantikan validasi identitas. Lihat dokumentasi resmi [getUser](https://supabase.com/docs/reference/javascript/auth-getuser) dan [getSession](https://supabase.com/docs/reference/javascript/auth-getsession).
- Ada pengecualian pada alur pembentukan sesi: action `signInDemo` memanggil `signInAnonymously()` dan memeriksa hasil user dari Supabase, bukan memerlukan sesi sebelumnya. Callback Google menukar kode OAuth dengan sesi melalui `exchangeCodeForSession()`. Keduanya tidak menggunakan `user_id` dari body request untuk menentukan pemilik data.
- Tidak ada route handler atau Server Action yang mempercayai `user_id` dari body request. Operasi penulisan kategori dan transaksi tidak mengirim kolom tersebut; pemilik baris diisi oleh default database `auth.uid()`. Fungsi SQL pencatatan OCR juga mengambil identitas dari `auth.uid()`.

## Row Level Security (RLS)

- Migrasi mengaktifkan RLS pada seluruh tabel aplikasi: `categories`, `transactions`, dan `ocr_logs`.
- Policy `categories` dan `transactions` membatasi `select`, `insert`, `update`, dan `delete` pada baris dengan `user_id = auth.uid()`. Pemeriksaan `using` membatasi baris yang dapat diakses, sedangkan `with check` membatasi kepemilikan hasil penulisan.
- `ocr_logs` hanya memiliki policy dan grant eksplisit untuk `select` serta `insert` milik sendiri. Aplikasi tidak menyediakan policy `update` atau `delete` untuk tabel tersebut.
- Grant tabel yang dinyatakan dalam migrasi diberikan kepada role `authenticated`. Tidak ada policy tabel untuk role `anon` yang membuka akses baris. Namun, migrasi tabel belum mencantumkan `revoke` eksplisit terhadap `anon` atau `public`; default grant serta hak akses efektif pada proyek Supabase aktif masih perlu diaudit. Dokumen ini tidak menyamakan tidak adanya grant dalam berkas dengan bukti bahwa seluruh privilege produksi sudah dicabut.
- Akun hasil anonymous sign-in berbeda dari role database `anon`: akun tersebut tetap menggunakan role `authenticated` dan RLS memisahkan datanya berdasarkan identitas akun. Pembatasan OCR memerlukan pemeriksaan anonim tambahan di server. Lihat [Anonymous Sign-Ins Supabase](https://supabase.com/docs/guides/auth/auth-anonymous).

## Isolasi data antar user

- Tabel `transactions` memiliki foreign key gabungan `(category_id, user_id)` yang mengacu pada `(id, user_id)` di `categories`. Pengguna tidak dapat menghubungkan transaksi dengan kategori milik akun lain, meskipun mengetahui UUID kategori tersebut.
- Pemeriksaan foreign key Postgres melewati RLS untuk menjaga integritas referensial. Foreign key yang hanya memeriksa `category_id` tidak membuktikan bahwa pemilik kategori sama dengan pemilik transaksi; constraint gabungan menambahkan jaminan tersebut. Lihat [Row Security Policies PostgreSQL](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).
- Menurut checklist penerimaan dalam [BLUEPRINT.md](BLUEPRINT.md), pengujian pemalsuan `category_id` melalui DevTools telah dilaporkan lulus. Pada action tambah transaksi, kategori yang tidak terlihat dalam akun ditolak dengan pesan "Pilih kategori yang tersedia di akun ini." Pengujian tersebut tidak dijalankan ulang saat dokumen ini dibuat; hasil lint atau build juga tidak membuktikan RLS proyek aktif.

## Validasi input

- Input divalidasi di server sebelum penulisan kategori atau transaksi. Pemeriksaan ketersediaan kategori menggunakan query yang tetap tunduk pada RLS; satu item invalid dalam penyimpanan hasil OCR membatalkan penulisan seluruh kumpulan.
- Nominal dari form menerima format Rupiah Indonesia: titik ribuan opsional dan koma desimal opsional dengan maksimal dua digit. Regex menolak format ambigu seperti `1.5` atau `1,500`, nilai nol, nilai negatif, dan nilai di atas kapasitas `numeric(14,2)`. Hasilnya dinormalisasi menjadi string desimal baku tanpa `parseFloat()` atau konversi `Number()`.
- Tanggal wajib berformat `YYYY-MM-DD` dan diperiksa berdasarkan jumlah hari setiap bulan, termasuk tahun kabisat. Tanggal seperti `31 Februari` ditolak.
- Nama kategori di-trim dan harus sepanjang 1–50 karakter. Catatan transaksi di-trim, dibatasi maksimal 200 karakter, dan catatan kosong menjadi `null`; field wajib yang kosong ditolak.
- Hasil OCR (Gemini atau Groq) diperlakukan sebagai input yang tidak dipercaya: nominal desimal baku, tanggal, catatan, dan petunjuk kategori divalidasi. Maksimal 20 transaksi ditampilkan; payload konfirmasi divalidasi ulang oleh action penyimpanan, termasuk kategori milik pengguna.

## Penanganan uang

- Nominal disimpan sebagai `numeric(14,2)`, bukan `float` atau `real`. Representasi desimal ini menghindari galat pembulatan biner pada nilai yang dicatat.
- Form mengirim nominal sebagai string. Setelah validasi, aplikasi mengirim string desimal baku ke database; normalisasi tidak menggunakan aritmetika floating point.
- Alur pembacaan belum sepenuhnya mempertahankan nominal sebagai string: tipe hasil query menerima `number | string`, dan halaman transaksi serta dashboard memakai `Number()` untuk pemformatan tampilan melalui `Intl.NumberFormat`. Karena itu, belum ada jaminan bahwa seluruh jalur database-ke-tampilan bebas konversi ke `number`.
- Ringkasan bulanan dihitung di SQL melalui `monthly_summary`, bukan dengan menjumlahkan transaksi di JavaScript. Hal ini juga menghindari total yang tidak lengkap akibat batas jumlah baris respons API.

## Tanggal dan zona waktu

- Aplikasi menentukan tanggal bisnis dengan zona `Asia/Jakarta` secara eksplisit agar tidak bergantung pada zona waktu runtime Supabase atau Vercel. Konfigurasi zona waktu produksi belum diperiksa ulang dalam penyusunan dokumen ini.
- Tanggal default form dihitung di server pada waktu request melalui `todayInJakarta()`, kemudian diteruskan ke klien. Pengguna dapat memilih tanggal lain; server tetap memvalidasi dan mengirim `occurred_on` secara eksplisit saat menyimpan.
- Walaupun skema masih memiliki default `current_date`, jalur penulisan transaksi aplikasi tidak bergantung padanya. Hal ini menghindari perbedaan tanggal ketika transaksi dicatat pada pukul 00:00–07:00 WIB sementara runtime menggunakan UTC.
- Pemeriksaan kuota OCR juga menentukan hari berdasarkan `now() at time zone 'Asia/Jakarta'` dalam SQL.

## OCR dan privasi

- Screenshot dapat dikirim ke Groq sebagai fallback kalau Gemini gagal, termasuk HTTP 503/429 atau error lain. Groq memakai model vision `qwen/qwen3.8-27b`. Gambar yang sama berpotensi dikirim ke dua provider pihak ketiga.
- API key Gemini dibaca hanya di modul server melalui `GEMINI_API_KEY`, tanpa prefix `NEXT_PUBLIC_`, dan dikirim ke Gemini melalui header `x-goog-api-key`. Modul ditandai `server-only`; key tidak disertakan dalam state yang dikembalikan ke browser.
- Gambar JPG, PNG, atau WebP maksimal 2 MiB diproses sebagai buffer dalam memori request. Aplikasi tidak menyimpan file gambar ke storage atau database. Pernyataan ini berlaku pada penyimpanan aplikasi, bukan sebagai jaminan penghapusan data oleh layanan Gemini.
- Mode demo ditolak pada halaman OCR dan kedua Server Action menggunakan `user.is_anonymous === true || !user.email`. Penolakan dilakukan sebelum membaca payload, mengecek kuota, memanggil Gemini, atau menulis transaksi. Pemeriksaan server tetap berlaku ketika action dipanggil tanpa melalui halaman.
- Gambar dan hasilnya dikirim ke layanan pihak ketiga. Menurut [ketentuan Gemini API](https://ai.google.dev/gemini-api/terms), layanan tidak berbayar dapat menggunakan input dan output untuk peningkatan produk serta teknologi pembelajaran mesin, termasuk peninjauan manusia. Google melarang pengiriman informasi sensitif, rahasia, atau pribadi pada layanan tersebut. Status billing dan wilayah dapat mengubah ketentuan yang berlaku; konfigurasi akun proyek belum diverifikasi di sini. Penolakan anonim mengurangi risiko pengunjung demo mengirim data pribadi, tetapi akun Google tetap harus menggunakan data contoh yang telah disamarkan bila memakai layanan tidak berbayar.
- Kuota aplikasi adalah 10 hasil OCR yang berhasil dan lolos validasi per pengguna per hari WIB, berdasarkan tabel `ocr_logs`. Pemeriksaan memakai `ocr_check()` sebelum panggilan provider OCR; `ocr_log()` hanya dipanggil setelah hasil valid. Kegagalan seluruh provider atau hasil tanpa transaksi valid tidak dicatat. Kegagalan pencatatan log menghasilkan peringatan dan tidak menghalangi pengguna melihat hasil.
- Retry otomatis dilakukan maksimal dua kali setelah percobaan awal jika Gemini mengembalikan HTTP 503 atau 429, dengan jeda 2000 ms. Status lain tidak di-retry. Retry merupakan pemulihan sementara, bukan jaminan ketersediaan layanan.

## Yang BELUM diimplementasikan

Daftar berikut membedakan perlindungan yang sudah ada dalam kode dari perkuatan yang masih direncanakan:

- **Batas global OCR per hari.** Kuota saat ini hanya per pengguna. Penolakan akun anonim mengurangi satu jalur penyalahgunaan, tetapi tidak menggantikan batas global atau mencegah penggunaan banyak akun Google. Batas global masih diperlukan untuk membatasi biaya dan beban layanan.
- **Penegakan kuota yang atomik.** `ocr_check()` dan `ocr_log()` merupakan dua panggilan terpisah. Permintaan paralel dapat sama-sama lolos sebelum log dicatat; kegagalan log juga membuat hasil sukses tidak terhitung. Mekanisme reservasi atau pembatasan atomik belum tersedia, sehingga angka 10 belum merupakan batas mutlak untuk seluruh kondisi konkurensi.
- **Rate limit tambahan dan CAPTCHA untuk anonymous sign-in.** Aplikasi belum mengirim token CAPTCHA pada action demo atau menyediakan pembatasan sendiri untuk pembuatan akun. Bot masih dapat mencoba membuat banyak akun. Rencana: CAPTCHA pada tombol "Coba Demo"; batas bawaan atau konfigurasi Supabase aktif belum diaudit dalam dokumen ini.
- **Cleanup otomatis akun anonim lama.** Repositori belum menyediakan scheduled job untuk menghapus akun anonim. Rencana: job Supabase yang menghapus akun anonim berumur lebih dari satu hari, dengan mempertimbangkan penghapusan data terkait melalui foreign key.
- **Audit log untuk aksi sensitif.** Belum ada pencatatan khusus untuk penghapusan kategori dan transaksi. `ocr_logs` merupakan catatan pemakaian OCR, bukan audit log seluruh perubahan data.
- **Audit privilege database produksi.** Grant efektif, default privilege, serta pencabutan akses `anon` dan `public` perlu diperiksa langsung pada proyek Supabase aktif. Migrasi dan checklist pengujian tidak menggantikan pemeriksaan konfigurasi tersebut.
- **Representasi string pada seluruh alur pembacaan uang.** Konversi `Number()` untuk tampilan masih ada. Pemformatan dan serialisasi yang mempertahankan presisi desimal sampai ke tampilan belum diterapkan secara menyeluruh.
- **Pembersihan fasilitas debugging OCR.** Respons mentah masih dapat ditampilkan dalam bagian debugging; potongan body error Gemini hingga 500 karakter dan peringatan log masih dicatat di server. Penghapusan logging sementara serta kebijakan retensi dan akses log belum ditetapkan.
- **Publikasi Google OAuth.** Menurut konteks proyek dalam blueprint, aplikasi masih berstatus "Testing" dan akses demo Google dibatasi pada test user. Konfigurasi Console belum diverifikasi ulang. Persyaratan publikasi dan verifikasi bergantung pada scope serta konfigurasi aplikasi; tidak ada dasar yang diverifikasi untuk menyebut adanya biaya verifikasi wajib. Lihat [OAuth app state overview Google](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview). Mode demo menyediakan jalur mencoba aplikasi selama proses publikasi belum diselesaikan.

## Cara melaporkan masalah

Kalau menemukan celah keamanan, buka issue di repo ini dengan label `security`. Jangan sertakan eksploitasi publik di issue terbuka.
