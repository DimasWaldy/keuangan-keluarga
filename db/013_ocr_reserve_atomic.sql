-- Fix F6: kuota OCR atomik dengan advisory lock per user.

create or replace function public.ocr_reserve()
returns table (allowed boolean, used int, daily_limit int, log_id uuid)
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
  v_log_id uuid;
begin
  if v_user_id is null then
    raise exception 'ocr_reserve: not authenticated';
  end if;

  -- Lock per user supaya dua request bersamaan tidak lolos cek
  perform pg_advisory_xact_lock(hashtext('ocr_reserve:' || v_user_id::text));

  select count(*) into v_used
  from public.ocr_logs
  where user_id = v_user_id
    and (created_at at time zone 'Asia/Jakarta')::date = v_today;

  if v_used >= v_daily_limit then
    return query select false, v_used, v_daily_limit, null::uuid;
    return;
  end if;

  -- Reservasi slot: insert SEBELUM memanggil provider
  insert into public.ocr_logs (user_id)
  values (v_user_id)
  returning id into v_log_id;

  return query select true, v_used + 1, v_daily_limit, v_log_id;
end;
$$;

revoke all on function public.ocr_reserve() from public, anon;
grant execute on function public.ocr_reserve() to authenticated;

-- ocr_release: kembalikan slot kalau provider gagal (HTTP error/network)
create or replace function public.ocr_release(p_log_id uuid)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted int;
begin
  if v_user_id is null then
    raise exception 'ocr_release: not authenticated';
  end if;

  delete from public.ocr_logs
  where id = p_log_id and user_id = v_user_id;

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

revoke all on function public.ocr_release(uuid) from public, anon;
grant execute on function public.ocr_release(uuid) to authenticated;
