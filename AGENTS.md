<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-rules -->

## Aturan proyek Keuangan Keluarga

Berlaku untuk semua pekerjaan, oleh manusia maupun AI. Urutan fase dan status ada di `docs/BLUEPRINT.md`.

### Cara kerja

- Kerjakan satu fase atau fitur per tugas. Jangan melompat ke fase berikutnya dan jangan menambah fitur di luar permintaan.
- Jangan menulis "teruji", "aman", atau "sudah deploy" tanpa bukti. Bedakan hasil lint, build, dan uji terisolasi dari uji di aplikasi dengan Supabase asli.
- Jangan membaca, mencetak, mengubah, atau meng-commit `.env.local` dan file secret lain. Jangan meminta nilai secret ditempel ke percakapan.
- Jangan membuat atau meng-commit file laporan, ZIP, atau file sementara di root proyek.
- Perubahan skema database hanya lewat file SQL baru di `db/` (`003_...sql`, dan seterusnya). Jangan mengedit file lama yang sudah dijalankan.

### Keamanan

- Setiap Server Action dan route handler memanggil `supabase.auth.getUser()` sendiri (bukan `getSession()`). Tanpa sesi, arahkan ke `/login`.
- Jangan menerima atau mengirim `user_id` dari kode aplikasi. Pemilik diisi default database dan RLS membatasi akses.
- Jangan memakai service-role atau secret key di kode aplikasi. Jangan beri awalan `NEXT_PUBLIC_` pada secret, misalnya API key Gemini.
- Setiap tabel baru wajib RLS, policy, dan `grant` eksplisit ke `authenticated`. View harus `security_invoker = true`. Fungsi SQL tetap `security invoker`.
- Total dan ringkasan dihitung di SQL, bukan dengan menarik baris ke aplikasi, karena API membatasi jumlah baris per permintaan.
- Validasi di server. Pesan error Bahasa Indonesia tanpa detail teknis database.

### Next.js 16

- `cacheComponents` aktif: halaman yang membaca data pengguna memanggil `await connection()` sebelum membuat client Supabase, di dalam boundary `Suspense`.
- Rute baru yang butuh sesi ditambahkan ke matcher `proxy.ts`.
- Jangan men-cache data pengguna (`use cache`).
- Tidak ada folder `src/`. Folder `app/` dan `utils/` ada di root.

### Format dan bahasa

- Teks antarmuka Bahasa Indonesia. Nominal rupiah memakai titik ribuan dan koma desimal, disimpan sebagai `numeric(14,2)`, dan dikirim sebagai string desimal, bukan float.
- Tanggal dihitung dengan zona Asia/Jakarta. Aplikasi selalu mengirim `occurred_on` dan tidak bergantung pada `current_date` database.

### Sebelum selesai

Jalankan `npm run lint` dan `npm run build`, lalu laporkan file yang diubah dan apa yang BELUM diuji.

<!-- END:project-rules -->
