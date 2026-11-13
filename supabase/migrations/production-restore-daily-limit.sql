-- PUBLIC LAUNCH: restore 10 krathongs per user per rolling 24 hours.
-- Run this before opening the site to everyone. Does not delete data.
begin;
create or replace function public.guard_krathong_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(823194701);
 if (select count(*) from public.krathongs where created_at > now() - interval '24 hours' and owner_id=new.owner_id) >= 10 then
  raise exception 'daily limit: 10 krathongs per user';
 end if;
 if (select count(*) from public.krathongs) >= 1000 then
  raise exception 'river full: ask the owner to archive old entries';
 end if;
 new.created_at := now();
 return new;
end;
$$;
revoke all on function public.guard_krathong_insert() from public, anon, authenticated;
commit;
