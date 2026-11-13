# Supabase Free: shared river and profile photos

1. Create a **Free** organization and project. Choose Singapore if offered. Keep the database password private.
2. Open **SQL Editor**, paste `setup.sql`, and run it. It creates the krathong table, policies, guard triggers, and public `avatars` bucket. It touches only objects named for this app. Review existing policies if reusing an existing project: extra permissive policies may weaken these restrictions.
3. Under **Authentication → Sign In / Providers** enable **Anonymous Sign-ins** (wording may vary). This creates a browser session without requiring email or a password. It is not Google sign-in and cannot recover an identity across browsers. Anonymous users count toward your plan's active users. Configure the service's rate limits and CAPTCHA before a large public event.
4. In the project's **Connect / API Keys / Settings → API** area, copy **Project URL** and **Publishable key** (a legacy **anon public** key also works). Never use `service_role`, a secret key, or the database password in this web app.
5. In **Render → Environment**, add:

   ```text
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_KEY
   ```

   Save and rebuild/deploy. Vite embeds these public settings at build time. Restarting an old build is insufficient. Local development uses these two fields in ignored `.env.local` (copy `.env.example`). Without both settings the game remains explicitly browser-local.
6. Check the shared river in two different browsers. Launch with a profile photo in one; within about 15 seconds it should appear in the other. Click the name to see the photo and wish. Check another launch without a photo to see the default avatar.

## Storage and costs

Original images never upload. The browser crops to a square, renders 256 × 256 pixels, and compresses to JPEG below 60,000 bytes. Input formats are JPG, PNG, WebP and AVIF, subject to browser support. The editor accepts up to 30 MB / 60 megapixels to protect device memory; larger images or HEIC require conversion before use. Photos render as circles but are stored as square JPEGs. Cancelling edits preserves the previously selected photo.

The bucket rejects other MIME types and files over 65,536 bytes. Uploads are allowed only in the session user's own folder. Public profile images and wishes are readable by others; “click to show” is a display choice, not access control. Photos are requested only when a wish dialog opens.

The database limits each user to 10 krathongs per 24 hours, 1,000 saved rows total, and 30 stored photos per user / 1,000 total. The UI shows the newest 30 recent krathongs and polls every 15 seconds while visible. These application limits reduce ordinary usage; they cannot guarantee free service under abusive traffic or arbitrarily large audiences. Anonymous sessions can be recreated by visitors. Check Supabase's current Free limits and usage dashboard and stay on Free; this app does not enable paid services.

Rows older than 30 days disappear from public queries but are **not automatically deleted**; stored photos also remain until explicitly removed. Before/after the festival, export any records you want to keep, remove old images through the Storage dashboard (or Storage API), and delete the corresponding database rows through the Table Editor. Do not delete `storage.objects` directly in SQL: that does not remove stored files. The app stops new submissions at its limits instead of silently deleting memories or upgrading plans. Supabase's inactivity and retention terms still apply.

## Validation scope

The repository includes SQL policy tests using a local PostgreSQL-compatible test database plus browser checks for local and mocked-online workflows. A real project's Auth, Storage and API settings still require the two-browser smoke test above after configuration; local tests do not establish a live Supabase deployment.

## Temple room (Realtime Presence)

The optional temple uses the existing public project URL, publishable key and anonymous session. No additional SQL is needed. Presence on the public channel `navait-temple-v1` keeps the currently connected room tabs visible and removes them after leaving or connection loss. Anonymous nickname avatars are not verified real-world identities. Public profile photos also appear on room avatars.

If the room reports a connection failure, check the project's Realtime service/public-channel configuration and browser WebSocket connectivity. No service_role key should be added to the website. After a new deployment, enter from two browsers, move and sit in one, then exit and close its tab to verify the other browser updates. The repository's WebSocket tests use a mock server and cannot validate the real project's switches or quotas.
