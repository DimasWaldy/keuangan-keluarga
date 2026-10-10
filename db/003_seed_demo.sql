-- Isi data contoh untuk akun demo (termasuk akun anonim).
-- Idempotent: kalau akun sudah punya kategori, fungsi berhenti tanpa error.
-- SECURITY INVOKER: RLS tetap berlaku, jadi hanya bisa mengisi data milik
-- user yang sedang login. Jangan diubah jadi SECURITY DEFINER.
create or replace function public.seed_demo_data()
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_month_start date :=
    (date_trunc('month', (now() at time zone 'Asia/Jakarta'))::date);
  v_income_id uuid;
  v_food_id uuid;
  v_transport_id uuid;
begin
  if v_user_id is null then
    raise exception 'seed_demo_data: not authenticated';
  end if;

  -- Kalau sudah ada kategori, anggap sudah pernah di-seed.
  if exists (select 1 from public.categories where user_id = v_user_id) then
    return;
  end if;

  insert into public.categories (name, type)
  values ('Gaji', 'income')
  returning id into v_income_id;

  insert into public.categories (name, type)
  values ('Makan', 'expense')
  returning id into v_food_id;

  insert into public.categories (name, type)
  values ('Transportasi', 'expense')
  returning id into v_transport_id;

  insert into public.transactions (category_id, amount, occurred_on, note)
  values
    (v_income_id,    5000000, v_month_start + 14, 'Gaji bulanan'),
    (v_food_id,        35000, v_month_start + 2,  'Makan siang'),
    (v_food_id,        78000, v_month_start + 6,  'Makan keluarga'),
    (v_food_id,        15000, v_month_start + 10, 'Kopi'),
    (v_transport_id,   20000, v_month_start + 3,  'Ojek online'),
    (v_transport_id,   50000, v_month_start + 15, 'Bensin');
end;
$$;

revoke all on function public.seed_demo_data() from public, anon;
grant execute on function public.seed_demo_data() to authenticated;