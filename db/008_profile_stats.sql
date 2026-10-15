create or replace function public.profile_stats()
returns table (
  total_transactions bigint,
  total_income numeric,
  total_expense numeric,
  top_category_name text,
  top_category_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  return query
  with user_tx as (
    select t.id, t.amount, c.name as category_name, c.type as category_type
    from public.transactions t
    join public.categories c on c.id = t.category_id and c.user_id = t.user_id
    where t.user_id = auth.uid()
  )
  select
    (select count(*) from user_tx) as total_transactions,
    (select coalesce(sum(amount), 0) from user_tx where category_type = 'income') as total_income,
    (select coalesce(sum(amount), 0) from user_tx where category_type = 'expense') as total_expense,
    (select category_name from user_tx group by category_name
     order by count(*) desc, category_name asc limit 1) as top_category_name,
    (select count(*) from user_tx group by category_name
     order by count(*) desc, category_name asc limit 1) as top_category_count;
end;
$$;

revoke all on function public.profile_stats() from public, anon;
grant execute on function public.profile_stats() to authenticated;
