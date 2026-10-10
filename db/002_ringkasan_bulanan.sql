-- Ringkasan bulanan: total pemasukan, pengeluaran, dan selisih untuk satu bulan.
--
-- Dihitung di database (bukan di aplikasi) karena API Supabase membatasi jumlah
-- baris per permintaan (default 1000), jadi menjumlah di aplikasi bisa diam-diam
-- salah kalau transaksi bulan itu banyak.
--
-- SECURITY INVOKER (bawaan): fungsi berjalan dengan hak pemanggil, sehingga RLS
-- tetap berlaku dan hanya transaksi milik user yang sedang login yang dihitung.
-- Jangan ganti menjadi SECURITY DEFINER, dan jangan buat view biasa untuk ini:
-- view biasa berjalan sebagai pemiliknya dan melewati RLS.
create or replace function public.monthly_summary(p_month date)
returns table (income numeric, expense numeric, net numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce(sum(t.amount) filter (where c.type = 'income'), 0) as income,
    coalesce(sum(t.amount) filter (where c.type = 'expense'), 0) as expense,
    coalesce(sum(t.amount) filter (where c.type = 'income'), 0)
      - coalesce(sum(t.amount) filter (where c.type = 'expense'), 0) as net
  from public.transactions t
  join public.categories c
    on c.id = t.category_id and c.user_id = t.user_id
  where t.occurred_on >= date_trunc('month', p_month::timestamp)::date
    and t.occurred_on <  (date_trunc('month', p_month::timestamp) + interval '1 month')::date;
$$;

-- Hanya user yang login yang boleh memanggil; anon dan publik tidak.
revoke all on function public.monthly_summary(date) from public, anon;
grant execute on function public.monthly_summary(date) to authenticated;
