# NAVAIT — คืนลอยกระทง

A Thai-language Loy Krathong browser game using Three.js, TypeScript and Vite.

## Run

Use Node.js 24 and npm, from this checkout:

```sh
npm ci --cache /tmp/navait-npm-cache
npm run dev -- --port 5173
```

Production validation: `npm run build`. Serve the output with `npm run preview`.
For Render Static Site, use `npm ci && npm run build`, publish directory `dist`, and leave Root Directory empty.

## River and crafts

Choose from nine locally generated, true 3D models inspired by Thai krathong crafts: folded banana leaves, pink lotus, marigold, jasmine garland, orchid, coconut shell, flower bread, banana-leaf swan, and three-tier lotus. Model shapes and preview thumbnails use the same geometry. These are stylized procedural interpretations, not scanned models or downloaded third-party assets.

The water shader animates flowing ripples and moonlight; candle flames flicker with soft glow and warm reflections. Boats bob and gently tilt while drifting rightward, eventually re-entering upstream. Simulation time advances only while the page is visible. Reduced-motion preferences freeze decorative motion. Rendering is capped at 30 fps and pixel ratio 1.5; static geometry is merged per material to reduce draw calls. Actual performance depends on device and GPU.

Nine labeled example crafts appear when no player boats have been saved, then disappear when the player launches a boat. Enter a nickname and optional wish, launch, then tap or keyboard-focus the boat's name to read its wish. Up to 30 player krathongs persist in this browser. Old saved krathongs migrate to corresponding new designs without losing names or wishes.

## Structure

- `src/catalog.ts`: nine craft definitions.
- `src/render/krathong.ts`: procedural models, batching, flame and glow.
- `src/render/water.ts`: water geometry and shader.
- `src/river.ts`: Three.js scene, fixed camera, resize, animation, DOM label projection and WebGL context recovery.
- `src/state.ts`: browser persistence and launch data.
- `src/main.ts`: form, craft picker and wish dialog.

## Profiles and shared river

The photo picker accepts common image formats and lets players drag, zoom (1–4×), or use directional buttons to crop. Only a compressed 256 × 256 JPEG (under 60 KB) is saved; original images never upload. Files above 30 MB / 60 megapixels are rejected with guidance. Photos are displayed inside the wish dialog after clicking a boat's name, never above the boat. Players without a photo receive a generated avatar.

Without online settings the game saves up to 30 boats with their cropped photos in this browser. When both public Supabase settings are configured, it uses anonymous sessions, Storage, and a shared river (latest 30 boats, refresh every 15 seconds while visible). Local boats are not automatically published when online mode is enabled.

Follow [supabase/README.md](supabase/README.md) to create a Free project, apply [supabase/setup.sql](supabase/setup.sql), enable anonymous sign-ins, and add the two public build-time variables in Render. Never put a service_role, secret key, or database password in Vite variables. Photos and wishes in shared mode are public content; showing them on click is not a privacy boundary. Live Supabase configuration is required before claiming shared operation works.

## Limits

There is no Google/email login or cross-device identity recovery. A WebGL2-capable browser is required; a visible error explains failed initialization. No external image, font or model service is required. Online mode needs the configured Supabase service. Application quotas reduce ordinary storage use but cannot guarantee free operation under unlimited traffic. See the Supabase guide for cleanup, retention and usage limits.

## Validation

```sh
npm test
npm run build
npx playwright install chromium  # once, if no browser is installed
npm run test:browser
```

For an existing system Chromium, run `BROWSER_EXECUTABLE=/usr/bin/chromium npm run test:browser` instead. Browser tests start their own Vite processes on ports 5180 and 5181, use synthetic images and a mocked Supabase service, and save screenshots under `/tmp/navait-profile-qa`. No real project key is needed. Database tests run the SQL twice in PGlite and verify RLS ownership, path validation, quotas, and timestamp enforcement. These tests do not replace validation against a real Supabase project after setup.

For the 3D scene, check all nine previews, rightward drift, water and candle animation, desktop/mobile layout and reduced motion. Actual mobile performance still needs a physical-device check.
