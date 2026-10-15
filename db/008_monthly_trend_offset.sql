create or replace function public.monthly_trend_until(p_end_month date, p_months int default 6)
returns table (month_start date, income numeric, expense numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  with months as (
    select (
      date_trunc('month', p_end_month::timestamp)
      - (i || ' months')::interval
    )::date as month_start
    from generate_series(0, least(greatest(p_months, 0), 24) - 1) as i
  )
  select
    m.month_start,
    coalesce(sum(t.amount) filter (where c.type = 'income'), 0) as income,
    coalesce(sum(t.amount) filter (where c.type = 'expense'), 0) as expense
  from months m
  left join public.transactions t
    on t.occurred_on >= m.month_start
    and t.occurred_on < (m.month_start + interval '1 month')::date
  left join public.categories c
    on c.id = t.category_id and c.user_id = t.user_id
  group by m.month_start
  order by m.month_start asc;
$$;

revoke all on function public.monthly_trend_until(date, int) from public, anon;
grant execute on function public.monthly_trend_until(date, int) to authenticated;
