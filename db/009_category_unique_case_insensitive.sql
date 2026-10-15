-- Cek dulu apakah ada duplikat case-insensitive di data yang sudah ada.
do $$
declare
  dup_count int;
begin
  select count(*) into dup_count
  from (
    select user_id, type, lower(btrim(name)) as lname, count(*) as cnt
    from public.categories
    group by user_id, type, lower(btrim(name))
    having count(*) > 1
  ) d;

  if dup_count > 0 then
    raise exception 'Ada % kelompok kategori duplikat (case-insensitive). Perbaiki dulu sebelum migrasi.', dup_count;
  end if;
end $$;

-- Hapus constraint unique lama (case-sensitive).
alter table public.categories
  drop constraint if exists categories_user_id_type_name_key;

-- Bikin unique index baru case-insensitive.
create unique index if not exists categories_user_type_lower_name_key
  on public.categories (user_id, type, lower(btrim(name)));
