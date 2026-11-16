-- Upgrade existing NAVAIT projects before publishing designs 9, 10 and 11.
-- Only widen the existing design constraint. No rows, photos, RLS or quotas change.
begin;
alter table public.krathongs drop constraint if exists krathongs_design_check;
alter table public.krathongs add constraint krathongs_design_check check (design between 0 and 11);
commit;
