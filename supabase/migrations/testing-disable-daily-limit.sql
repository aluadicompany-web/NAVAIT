-- TESTING MODE: disable only the per-user 10-per-24-hours rule.
-- Run in Supabase SQL Editor as the project administrator.
-- Does not delete rows or images. Global capacity and server timestamps remain.
begin;
create or replace function public.guard_krathong_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(823194701);
 if (select count(*) from public.krathongs) >= 1000 then
  raise exception 'river full: ask the owner to archive old entries';
 end if;
 new.created_at := now();
 return new;
end;
$$;
revoke all on function public.guard_krathong_insert() from public, anon, authenticated;
commit;
