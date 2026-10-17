-- Fix F1: kunci rule sebelum membuat transaksi dan memajukan jadwal.
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
    for update
  loop
    v_next := v_rule.next_run_date;
    v_safety := 0;

    while v_next <= v_today and v_safety < 24 loop
      insert into public.transactions (category_id, amount, occurred_on, note)
      values (v_rule.category_id, v_rule.amount, v_next, v_rule.note);

      v_created := v_created + 1;
      v_safety := v_safety + 1;

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
