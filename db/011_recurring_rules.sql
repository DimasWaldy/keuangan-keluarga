-- Tabel recurring_rules: definisi transaksi yang berulang.
-- v1 hanya support monthly. Frekuensi lain bisa ditambah nanti.
create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  category_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 50),
  amount numeric(14,2) not null check (amount > 0),
  note text check (char_length(note) <= 200),
  frequency text not null default 'monthly' check (frequency = 'monthly'),
  day_of_month smallint not null check (day_of_month between 1 and 31),
  next_run_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete cascade
);

create index recurring_rules_user_next_idx
  on public.recurring_rules (user_id, next_run_date)
  where is_active = true;

-- Trigger updated_at (pakai fungsi set_updated_at yang sudah ada dari 010)
create trigger recurring_rules_updated_at
  before update on public.recurring_rules
  for each row
  execute function public.set_updated_at();

-- RLS
alter table public.recurring_rules enable row level security;

create policy "recurring_rules: hanya milik sendiri"
  on public.recurring_rules for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.recurring_rules to authenticated;

-- Fungsi: jalankan semua rule yang next_run_date <= hari ini (WIB)
-- untuk user yang sedang login. Bikin transaksi, update next_run_date.
-- Return jumlah transaksi yang dibuat.
create or replace function public.run_recurring_rules()
returns int
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_rule record;
  v_created int := 0;
  v_next date;
  v_safety int := 0;
begin
  if v_user_id is null then
    raise exception 'run_recurring_rules: not authenticated';
  end if;

  for v_rule in
    select id, category_id, amount, note, day_of_month, next_run_date
    from public.recurring_rules
    where user_id = v_user_id
      and is_active = true
      and next_run_date <= v_today
    order by next_run_date asc
  loop
    -- Safety: maksimal 24 iterasi per rule (2 tahun ke depan), biar
    -- kalau next_run_date udah lewat jauh, tetap dibatasi.
    v_next := v_rule.next_run_date;
    v_safety := 0;

    while v_next <= v_today and v_safety < 24 loop
      insert into public.transactions (category_id, amount, occurred_on, note)
      values (v_rule.category_id, v_rule.amount, v_next, v_rule.note);

      v_created := v_created + 1;
      v_safety := v_safety + 1;

      -- Advance ke bulan berikutnya, clamp day_of_month kalau bulan
      -- berikutnya lebih pendek (misal day=31 di Februari -> 28/29).
      v_next := (
        date_trunc('month', v_next::timestamp) + interval '1 month'
      )::date + (least(
        v_rule.day_of_month,
        extract(day from (
          date_trunc('month', v_next::timestamp) + interval '2 month'
          - interval '1 day'
        ))::int
      ) - 1);
    end loop;

    update public.recurring_rules
    set next_run_date = v_next
    where id = v_rule.id;
  end loop;

  return v_created;
end;
$$;

revoke all on function public.run_recurring_rules() from public, anon;
grant execute on function public.run_recurring_rules() to authenticated;
