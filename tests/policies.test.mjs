import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

test("Supabase schema, RLS ownership, file paths, quotas and timestamp guards", async () => {
  const db = new PGlite();
  const a = "11111111-1111-4111-8111-111111111111",
    b = "22222222-2222-4222-8222-222222222222";
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key);insert into auth.users values('${a}'),('${b}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array(regexp_replace($1,'/[^/]+$',''),'/')$$;
 alter table storage.objects enable row level security;
 grant usage on schema public,auth,storage to anon,authenticated;
 grant select,insert,delete on storage.objects to authenticated;`);
  const schema = await readFile(
    new URL("../supabase/setup.sql", import.meta.url),
    "utf8",
  );
  await db.exec(schema);
  await db.exec(schema); // Repeatability.
  const session = async (role) => {
    await db.exec(
      `reset role;select set_config('request.jwt.claim.sub','${role === "anon" ? "" : role}',false);set role ${role === "anon" ? "anon" : "authenticated"};`,
    );
  };
  const insert = async (owner = a, extra = {}) => {
    const id = crypto.randomUUID();
    const row = {
      name: "ดาว",
      wish: "ขอให้สุขใจ",
      design: 2,
      color: 123,
      x: 0.3,
      y: 0.6,
      ...extra,
    };
    return db.query(
      "insert into public.krathongs(id,owner_id,name,wish,design,color,x,y,avatar_path,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [
        id,
        owner,
        row.name,
        row.wish,
        row.design,
        row.color,
        row.x,
        row.y,
        row.avatar_path ?? null,
        row.created_at ?? new Date().toISOString(),
      ],
    );
  };
  try {
    await session("anon");
    await assert.rejects(() => insert());
    await session(a);
    await insert();
    await assert.rejects(() => insert(b));
    await assert.rejects(() => insert(a, { design: 9 }));
    await assert.rejects(() =>
      insert(a, { avatar_path: `${b}/${crypto.randomUUID()}.jpg` }),
    );
    await assert.rejects(() =>
      db.exec("update public.krathongs set wish='changed'"),
    );
    await assert.rejects(() => db.exec("delete from public.krathongs"));
    await session("anon");
    assert.equal(
      (await db.query("select * from public.krathongs")).rows.length,
      1,
    );
    await session(a);
    await insert(a, { created_at: "2000-01-01T00:00:00Z" });
    const rows = await db.query("select created_at from public.krathongs");
    assert.ok(
      rows.rows.every((r) => Date.parse(r.created_at) > Date.now() - 60000),
    );
    for (let i = 0; i < 8; i++) await insert();
    await insert(); // The 11th boat is allowed in testing mode.
    await db.exec("reset role");
    const restore = await readFile(
      new URL(
        "../supabase/migrations/production-restore-daily-limit.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(restore);
    await session(a);
    await assert.rejects(() => insert(), /daily limit/);
    await db.exec("reset role");
    const disable = await readFile(
      new URL(
        "../supabase/migrations/testing-disable-daily-limit.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(disable);
    await db.exec(disable);
    await session(a);
    await insert(); // An existing limited database is unlocked, with repeatable migration.

    const photo = `${a}/${crypto.randomUUID()}.jpg`;
    await db.query(
      "insert into storage.objects(bucket_id,name) values ('avatars',$1)",
      [photo],
    );
    await assert.rejects(() =>
      db.query(
        "insert into storage.objects(bucket_id,name) values ('avatars',$1)",
        [`${b}/${crypto.randomUUID()}.jpg`],
      ),
    );
    await assert.rejects(() =>
      db.query(
        "insert into storage.objects(bucket_id,name) values ('avatars',$1)",
        [`${a}/${crypto.randomUUID()}.svg`],
      ),
    );
    await session(b);
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
    );
    await db.query("delete from storage.objects where name=$1", [photo]);
    await db.exec("reset role");
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      1,
    );
    const bucket = (
      await db.query("select * from storage.buckets where id='avatars'")
    ).rows[0];
    assert.equal(bucket.file_size_limit, 65536);
    assert.deepEqual(bucket.allowed_mime_types, ["image/jpeg"]);
    await db.exec(
      "update public.krathongs set created_at=now()-interval '31 days'",
    );
    await session("anon");
    assert.equal(
      (await db.query("select * from public.krathongs")).rows.length,
      0,
    );
    await db.exec("reset role");
    await db.exec(
      `insert into storage.objects(bucket_id,name) select 'avatars','${a}/'||gen_random_uuid()||'.jpg' from generate_series(1,29)`,
    );
    await session(a);
    await assert.rejects(
      () =>
        db.query(
          "insert into storage.objects(bucket_id,name) values ('avatars',$1)",
          [`${a}/${crypto.randomUUID()}.jpg`],
        ),
      /avatar limit/,
    );
    await db.exec(
      "reset role;alter table public.krathongs disable trigger guard_krathong_insert;truncate public.krathongs;",
    );
    await db.exec(
      `insert into public.krathongs(id,owner_id,name,wish,design,color,x,y) select gen_random_uuid(),'${b}','seed','',0,1,.3,.6 from generate_series(1,1000);alter table public.krathongs enable trigger guard_krathong_insert;`,
    );
    await session(a);
    await assert.rejects(() => insert(), /river full/);
  } finally {
    await db.close();
  }
});
