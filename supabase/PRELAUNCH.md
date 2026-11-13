# Testing limits and prelaunch cleanup

## Unlock the existing test project

Open `migrations/testing-disable-daily-limit.sql`, copy the entire file into Supabase **SQL Editor**, and run it as the project administrator. `Success. No rows returned` means the server function was replaced. The same anonymous user can then submit more than ten krathongs in a rolling 24-hour period.

This is an idempotent, transactional function replacement. It preserves existing data, ownership/RLS policies, the 1,000-row global guard, and server-assigned timestamps. The 30-photo-per-user / 1,000-photo storage guards and image-size restrictions are unchanged. A Git push or Render deployment alone does not execute SQL against the real project.

## Before public launch (do not perform during active testing)

The owner can remove all test krathongs and profile images when ready. This work has not been executed by preparing these files.

1. Close the test game tabs and keep the site private during cleanup so new test data is not added while removing old data. Export anything you want to retain before proceeding.
2. In Supabase **Storage → avatars**, remove every stored file in every folder, including files that are no longer referenced by a krathong. Use the Storage dashboard or Storage API to remove actual objects. Do not delete `storage.objects` with SQL: deleting metadata does not remove the underlying files. Keep the bucket and its policies for future player uploads.
3. In Supabase **Table Editor → krathongs**, delete the test rows. Alternatively, as the administrator, run `delete from public.krathongs;` in SQL Editor only when you intend to remove all test wishes. Keep the table, triggers, policies and other application configuration.
4. Verify the table contains zero rows and the `avatars` bucket contains zero files, checking every folder/page. Deleted public images may remain in clients/CDN caches temporarily; reusing old image URLs does not instantly clear those caches.
5. Run `migrations/production-restore-daily-limit.sql` to restore 10 krathongs per user per rolling 24 hours. This does not reset the global/image caps. Restore and test this rule before public launch.
6. Reload the game in a fresh browser session. Nine labeled demonstration crafts may appear when no saved krathongs exist; they are generated examples, not leftover database records. Close/reload old test room tabs to clear ephemeral Realtime presence. Local-only test data in browsers is separate from online data.
7. Run a final real-project smoke test for photo upload, shared wishes and temple presence. Remove those final smoke-test records/images too if the launch must start completely empty.

Admin deletion needs project-owner access, which the public website key intentionally does not provide. Never put a service_role/secret key or database password into Vite variables or share them in chat. Clean up only `avatars` objects and `krathongs` rows; do not delete the project, unrelated buckets, Auth users or database schema as a shortcut.
