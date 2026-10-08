-- Kategori
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 50),
  type text not null check (type in ('income', 'expense')),
  created_at timestamptz not null default now(),
  unique (user_id, type, name),
  unique (id, user_id)  -- dibutuhkan foreign key gabungan di transactions
);

-- Transaksi
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  category_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  occurred_on date not null default current_date,
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  foreign key (category_id, user_id)
    references public.categories (id, user_id)
);

create index transactions_user_date_idx
  on public.transactions (user_id, occurred_on desc);

-- Row Level Security
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

create policy "categories: hanya milik sendiri"
  on public.categories for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "transactions: hanya milik sendiri"
  on public.transactions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Hak akses eksplisit: hanya user login, anon tidak dapat apa-apa
grant select, insert, update, delete
  on public.categories, public.transactions to authenticated;