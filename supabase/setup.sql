-- Run once in Supabase SQL Editor. Safe to rerun for this app's own objects.
-- Enable Authentication > Providers > Anonymous Sign-ins separately.
create table if not exists public.krathongs (
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 name text not null check (char_length(btrim(name)) between 1 and 24),
 wish text not null default '' check (char_length(wish) <= 100),
 design smallint not null check (design between 0 and 8),
 color integer not null check (color between 0 and 16777215),
 x double precision not null check (x between 0.05 and 0.95),
 y double precision not null check (y between 0.45 and 0.8),
 avatar_path text check (avatar_path is null or avatar_path = owner_id::text || '/' || id::text || '.jpg'),
 created_at timestamptz not null default now()
);
create index if not exists krathongs_created_idx on public.krathongs(created_at desc);
create index if not exists krathongs_owner_created_idx on public.krathongs(owner_id,created_at desc);
alter table public.krathongs enable row level security;
revoke all on public.krathongs from anon, authenticated;
grant select on public.krathongs to anon, authenticated;
grant insert on public.krathongs to authenticated;

-- Count under an advisory lock to keep concurrent inserts within the limits.
-- Testing mode: per-user daily limit is disabled. Server timestamps remain trusted.
-- Before public launch, run migrations/production-restore-daily-limit.sql.
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
drop trigger if exists guard_krathong_insert on public.krathongs;
create trigger guard_krathong_insert before insert on public.krathongs for each row execute function public.guard_krathong_insert();

drop policy if exists "Read recent krathongs" on public.krathongs;
create policy "Read recent krathongs" on public.krathongs for select to anon, authenticated using (created_at > now() - interval '30 days');
drop policy if exists "Insert own krathong" on public.krathongs;
create policy "Insert own krathong" on public.krathongs for insert to authenticated with check (owner_id = (select auth.uid()));
-- No client update/delete grants: a different player cannot edit a wish.

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('avatars','avatars',true,65536,array['image/jpeg'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Public bucket: profile photos are public content, displayed on click in the UI.
-- Limit total uploads including abandoned objects; no unlimited hidden uploads.
create or replace function public.guard_avatar_upload() returns boolean
language plpgsql security definer set search_path = '' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(823194702);
 if (select count(*) from storage.objects where bucket_id='avatars') >= 1000 then
  raise exception 'avatar limit: storage full';
 end if;
 if (select count(*) from storage.objects where bucket_id='avatars' and pg_catalog.split_part(name,'/',1) = auth.uid()::text) >= 30 then
  raise exception 'avatar limit: 30 photos per user';
 end if;
 return true;
end;
$$;
revoke all on function public.guard_avatar_upload() from public, anon;
grant execute on function public.guard_avatar_upload() to authenticated;
drop policy if exists "Upload own avatar" on storage.objects;
create policy "Upload own avatar" on storage.objects for insert to authenticated with check (
 bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text
 and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$' and public.guard_avatar_upload()
);
drop policy if exists "Read own avatar metadata" on storage.objects;
create policy "Read own avatar metadata" on storage.objects for select to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Remove own avatar" on storage.objects;
create policy "Remove own avatar" on storage.objects for delete to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
