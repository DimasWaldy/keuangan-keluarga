create or replace function public.expense_by_category(p_month date)
returns table (category_id uuid, category_name text, total numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id as category_id,
    c.name as category_name,
    coalesce(sum(t.amount), 0) as total
  from public.categories c
  join public.transactions t
    on t.category_id = c.id and t.user_id = c.user_id
  where c.type = 'expense'
    and t.occurred_on >= date_trunc('month', p_month::timestamp)::date
    and t.occurred_on <  (date_trunc('month', p_month::timestamp) + interval '1 month')::date
  group by c.id, c.name
  having sum(t.amount) > 0
  order by sum(t.amount) desc;
$$;

revoke all on function public.expense_by_category(date) from public, anon;
grant execute on function public.expense_by_category(date) to authenticated;
