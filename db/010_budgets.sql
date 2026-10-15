-- Tabel budgets: satu budget per kategori per user.
-- Hanya untuk kategori bertipe 'expense' (dicek di aplikasi).
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  category_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id),
  foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete cascade
);

create index budgets_user_idx on public.budgets (user_id);

-- Trigger untuk update updated_at otomatis
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger budgets_updated_at
  before update on public.budgets
  for each row
  execute function public.set_updated_at();

-- RLS
alter table public.budgets enable row level security;

create policy "budgets: hanya milik sendiri"
  on public.budgets for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.budgets to authenticated;

-- Fungsi untuk mengambil status budget + pemakaian bulan tertentu
create or replace function public.budget_status(p_month date)
returns table (
  budget_id uuid,
  category_id uuid,
  category_name text,
  budget_amount numeric,
  spent_amount numeric,
  percentage numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with month_start as (
    select date_trunc('month', p_month::timestamp)::date as start_date
  ),
  month_end as (
    select (date_trunc('month', p_month::timestamp) + interval '1 month')::date as end_date
  )
  select
    b.id as budget_id,
    c.id as category_id,
    c.name as category_name,
    b.amount as budget_amount,
    coalesce(sum(t.amount), 0) as spent_amount,
    round((coalesce(sum(t.amount), 0) / b.amount) * 100, 2) as percentage
  from public.budgets b
  join public.categories c on c.id = b.category_id and c.user_id = b.user_id
  cross join month_start ms
  cross join month_end me
  left join public.transactions t
    on t.category_id = c.id
    and t.user_id = c.user_id
    and t.occurred_on >= ms.start_date
    and t.occurred_on < me.end_date
  group by b.id, c.id, c.name, b.amount
  order by c.name asc;
$$;

revoke all on function public.budget_status(date) from public, anon;
grant execute on function public.budget_status(date) to authenticated;
