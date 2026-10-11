-- Log percobaan OCR per user, dan fungsi cek batas harian.
--
-- Batas per user per hari: 10 request (zona WIB). Kalau perlu diubah,
-- tinggal ganti angka v_daily_limit di dalam fungsi.
--
-- Semua security invoker: RLS tetap berlaku, jadi fungsi ini hanya bisa
-- melihat dan menyisipkan baris milik user yang sedang login.
-- Batas global per hari BELUM ada di versi ini (lihat catatan di BLUEPRINT).

create table public.ocr_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index ocr_logs_user_created_idx
  on public.ocr_logs (user_id, created_at desc);

alter table public.ocr_logs enable row level security;

create policy "ocr_logs: hanya milik sendiri"
  on public.ocr_logs for select to authenticated
  using (user_id = (select auth.uid()));

create policy "ocr_logs: insert milik sendiri"
  on public.ocr_logs for insert to authenticated
  with check (user_id = (select auth.uid()));

grant select, insert on public.ocr_logs to authenticated;

-- Cek batas harian dan catat percobaan. Return satu baris:
--   allowed = false -> user sudah capai batas, JANGAN panggil Gemini
--   allowed = true  -> boleh lanjut, percobaan sudah dicatat
create or replace function public.ocr_check_and_log()
returns table (allowed boolean, used int, daily_limit int)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_daily_limit constant int := 10;
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_used int;
begin
  if v_user_id is null then
    raise exception 'ocr_check_and_log: not authenticated';
  end if;

  select count(*) into v_used
  from public.ocr_logs
  where user_id = v_user_id
    and (created_at at time zone 'Asia/Jakarta')::date = v_today;

  if v_used >= v_daily_limit then
    return query select false, v_used, v_daily_limit;
    return;
  end if;

  insert into public.ocr_logs (user_id) values (v_user_id);

  return query select true, v_used + 1, v_daily_limit;
end;
$$;

revoke all on function public.ocr_check_and_log() from public, anon;
grant execute on function public.ocr_check_and_log() to authenticated;