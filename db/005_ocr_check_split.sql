-- Pisahkan pemeriksaan kuota dari pencatatan OCR yang berhasil.
-- ocr_check_and_log() tetap tersedia untuk kompatibilitas.

create or replace function public.ocr_check()
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
    raise exception 'ocr_check: not authenticated';
  end if;

  select count(*) into v_used
  from public.ocr_logs
  where user_id = v_user_id
    and (created_at at time zone 'Asia/Jakarta')::date = v_today;

  return query select v_used < v_daily_limit, v_used, v_daily_limit;
end;
$$;

create or replace function public.ocr_log()
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'ocr_log: not authenticated';
  end if;

  insert into public.ocr_logs (user_id, created_at)
  values (v_user_id, now());
end;
$$;

revoke all on function public.ocr_check() from public, anon;
grant execute on function public.ocr_check() to authenticated;

revoke all on function public.ocr_log() from public, anon;
grant execute on function public.ocr_log() to authenticated;
