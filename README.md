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

The photo picker accepts common image formats and lets players drag, zoom (1–4×), or use directional buttons to crop. Only a compressed 256 × 256 JPEG (under 60 KB) is saved; original images never upload. Files above 30 MB / 60 megapixels are rejected with guidance. Photos are displayed on the submitting player's circular avatar head during the launch ceremony and inside the wish dialog after clicking a boat's name; they do not float above boats. Players without a photo receive a generated avatar.

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

## Atmosphere and sharing

The header's sound button starts quiet synthesized water, wind, and occasional birdlike chirps through Web Audio. Audio is off on initial load and starts only on a user gesture. It suspends while the page is hidden. Launching adds a soft chime when sound is enabled, plus three expanding ripples and 14 short-lived light particles. There is at most one launch effect at a time, cleaned up after 2.8 simulation seconds; reduced-motion preferences disable it. No audio assets or additional network requests are needed.

Online launches offer **แชร์กระทงของฉัน**; the wish dialog can also share its krathong. Sharing uses the device share sheet, then clipboard, with a selectable-link fallback when neither is available. Cancelling native sharing does not report success. Browser-local boats cannot be shared across devices, so their share controls are hidden.

Links use `?krathong=<UUID>` on the existing page, requiring no Render rewrite or SQL migration. Opening a link reads that row directly, highlights its boat, and opens its wish. The target stays included when the newest-30 list refreshes. The database's existing 30-day visibility policy still applies; expired, deleted, invalid, or unavailable targets show a clear message and a path to join the river. Only the generic site preview appears in social apps; this implementation does not generate per-boat social preview images.

The browser suite also checks real Web Audio output samples and suspension, launch-effect cleanup, removed lower-left text, native/clipboard/manual share behavior, cancellation, and direct links to rows outside the newest 30. Service interactions use mocked responses; production configuration is unchanged.

## Thai riverside festival scene

`src/render/festival.ts` builds a stylized Thai temple with tiered red roofs and chofa, golden chedis, a low wooden landing, fair stalls, bunting, hanging lamps, and warm light strings. The landing sits close to the water and new boats glide from a safe release point beyond its end into the river over three simulation seconds. Existing saved data is preserved; every rendered boat, including older saves and shared links, uses the safe river channel.

Static architecture is merged into two vertex-colored meshes (lit surfaces and decorative lights). Sky lanterns use instancing: 18 on desktop and 10 on narrow screens. They rise slowly with a gentle sway; reduced motion freezes their positions and skips release animation. No downloaded models, image textures, shadow maps, or postprocessing are needed. Two shadow-free warm point lights illuminate the landing and temple. The water shader adds warm fragmented festival reflections. The existing 30 fps and 1.5 pixel-ratio caps remain in place.

Browser coverage checks lantern ascent, unchanged poses at a frozen simulation time, mobile/desktop instance counts, bounded scene batches, and the existing launch/profile/audio/share workflows. Inspect desktop and mobile screenshots and test actual mobile hardware before making frame-rate guarantees.


## Landing clearance and natural light

`src/navigation.ts` defines a common safe channel and release position. All boats (including examples, old saves, focused shared boats, resized views, and newly launched boats) remain beyond the landing with room for the largest craft. This changes rendering, not saved wishes or profile data. Navigation tests sample portrait/landscape viewports, all legacy depth ranges, horizontal drift/wrap and launch interpolation with a conservative craft radius.

The temple and dock are brighter. Warm lamps vary slowly with small, out-of-phase changes; shared shader uniforms animate decorative-light brightness without splitting the static geometry batches. Two shadow-free lights gently illuminate actual surfaces, the soft lamp halos breathe, and the water's warm reflections ripple. These changes use the same paused/reduced-motion simulation clock, so reduced motion freezes the lighting too.


## Avatar launch ceremony

After a successful save, the submitting player sees a gender-neutral chibi body carrying their selected 3D krathong. A circular portrait (or generated default avatar) replaces the head, with the player's name above it. Entry is randomly from the left or right bank, followed by a walk along the pier, a bow/lower gesture, one boat handoff, and a walk back. Success and sharing controls appear at the actual release, not before. Shirt colors are randomly drawn without repeating within the current page session.

`src/ceremony.ts` owns the timeline and outfit selection. `src/render/avatar.ts` renders the jointed body, arms following the carried bowl, portrait and name. `River.walkAndRelease` holds the saved boat out of the water renderer until the handoff; polling cannot spawn a duplicate while the ceremony is pending. The boat begins at the carried transform and scale, then smoothly joins the safe channel. Reduced-motion mode skips the walking path and long wait. Hidden tabs pause the ceremony. Temporary body geometry and portrait elements are removed after departure; at most one actor is rendered.

The ceremony is a local presentation for the person submitting. Supabase continues sharing saved krathongs, photos and wishes; the outdoor launch ceremony does not synchronize character walking between viewers. Walking inside the temple uses the separate live room described below. No SQL changes or new storage uploads are required. A save completes before the ceremony, so leaving the page during a walk does not discard the saved wish.

Timeline tests cover both entry sides, pier alignment, release clearance, reduced motion, and nonrepeating outfit allocation. Browser coverage checks the uploaded portrait/name, walk/landing/lowering phases, no early or duplicate water boat, delayed success, and existing profile/audio/share workflows.

## Optional temple interior and live room

After releasing a krathong, **เข้าโบสถ์** opens a separate, lazily loaded 3D scene. It contains a seated Buddha on a lotus dais, halo, lacquered wall panels, red/gold columns, windows, offering tables, flowers, candles, incense, prayer cushions and a carpet. The player can click/tap the floor, use WASD/arrow keys, or use the mobile direction pad. Movement stays inside the hall and cannot enter the altar. **นั่งสวดมนต์** changes the avatar to a kneeling wai pose; movement stands it up. **กลับท่าน้ำ** returns to the existing river. Outdoor rendering/audio pause while indoors.

The hall uses Supabase Realtime Presence on the public channel `navait-temple-v1`, using the existing anonymous session and public project settings. No new database table, SQL migration, or secret key is required. Only tabs that enter the hall are tracked; leaving untracks and unsubscribes, and disconnected sockets disappear when the Realtime server detects disconnection. A background tab can remain present while its socket is connected. There are no pretend players. Without online settings the room explicitly works as a single-device room.

Each room tab has a distinct ephemeral ID. Presence carries only its saved krathong ID, position and prayer state; names and profile paths resolve from public saved rows. Payloads are validated and constrained to the walking bounds. Up to 24 avatars render locally. Position updates are throttled to 750 ms while moving and sent on stopping/prayer changes; idle frames do not publish presence. Realtime consumes the project's existing Free-plan quotas; no paid service is enabled. Verify that public Realtime channels are permitted in the real project if the room reports a connection failure.

**ฟังบทสวด** uses device speech synthesis to read the Thai-script Pali homage (“นะโม ตัสสะ …”) three times with a quiet pause between cycles. It is a spoken recitation, not a recording of monks. It starts only on a button press, stops on leaving/hidden tabs, and needs a Thai voice on the device. Unsupported or unavailable voices show guidance instead of claiming playback succeeded. There is no downloaded or unlicensed chant recording.

Run `BROWSER_EXECUTABLE=/usr/bin/chromium npm run test:temple` for two-context browser QA. This uses the real Supabase client with mocked HTTP and WebSocket service boundaries and tests joining, movement, praying, idle throttling, explicit leave/rejoin, disconnection removal, recitation control, and desktop/mobile layouts. Screenshots are in `/tmp/navait-temple-qa`. It does not prove a live project's Realtime settings; after deployment, verify two real browsers can see each other and that an exited player disappears.

## Solo testing and public-launch reset

The setup SQL now uses testing mode with no per-user daily krathong limit. Existing Supabase projects must run [the testing migration](supabase/migrations/testing-disable-daily-limit.sql) once; a website deployment does not change the live database function. Global storage/capacity and ownership guards remain active. Use [the prelaunch guide](supabase/PRELAUNCH.md) to remove test objects/rows later and restore the daily rule before public launch. Preparing this change does not delete any live data or apply a live migration.

## Temple surface materials

The interior uses separate batched materials for veined stone tiles, fine plaster, wood grain, glossy red lacquer, woven fabric, gold leaf and the lotus-pattern mural. UVs retain their surface scale; display-color maps use sRGB while height/roughness maps remain linear. The Buddha and round decorative objects use smoother geometry and metal roughness with a small generated room-light reflection environment.

All texture maps are generated locally at 256–512 pixels, with a 64-pixel-per-face environment cube, mipmaps and modest anisotropy. They are created only when entering the temple and disposed on exit. No external texture downloads, shadow maps or screen-space reflections are required. The material batches preserve the existing walking/presence system and the river scene's lighting.

## Gently varied tiles and soft cushions

The floor uses a deterministic tile layout with 16 texture variants. A small subset has short hairline cracks, another subset is mildly faded, and the rest stays clean with subtle tone differences. The condition does not change each time the room loads; there are no broken chunks, heavy stains or holes. All tiles share one material/atlas batch.

Prayer cushions use rounded, slightly domed geometry with a shallow center tuft, fabric piping, woven material and soft contact shading. Cushion shadows share one small texture and one instanced draw. Walking boundaries and online player data are unchanged. The lazy temple geometry helper is included in Vite dependency optimization to avoid a first-entry development reload on a fresh cache.

## Automatic wishes from NAVAIT

`src/blessings.ts` contains 20 distinct Thai personal wishes, including love, family, health and happiness. A blank or whitespace-only wish is resolved at creation time, stored in the existing `wish` field so the same text appears after refresh, on other devices and through a shared link. Authored wishes are preserved using the existing trim/100-character limit. All generated text fits that limit; no SQL migration is needed.

Each browser uses a persisted shuffled deck, drawing all 20 before a new cycle and avoiding an adjacent duplicate at the cycle boundary. If storage is unavailable it falls back to an in-memory deck. This does not guarantee different messages across different players/browsers. Older saved records with an empty wish show a stable, ID-derived blessing when opened, without modifying their stored data.

## Side-view temple fair

After releasing a krathong, choose **เดินเล่นงานวัด** to enter a separate 3,800-unit 2D promenade. Walk with left/right arrows or A/D, hold the mobile arrow buttons, tap the street, or choose a destination in the top map. E or the nearby shop button opens an activity. Escape closes a shop, or returns to the river when outside a shop.

Six stops include Thai sweets, a five-throw balloon round with reset, a food stall, an animated Ferris wheel with ride/exit, wishing stars, and drinks/cotton candy. Food stalls are scenic browsing stops; there are no purchases, payments, or inventories. The player uses their existing name/photo and a name-derived outfit color. Background visitors are decorative NPCs; this first fair scene does not synchronize players online.

The scene uses a cached Canvas 2D illustration, layered parallax, capped pixel ratio, reduced-motion support, visibility pause, and a lazy module (~7 KB gzip). It reuses the current app without adding another engine dependency. The river and ambient audio pause while visiting; closing disposes the scene and restores the river. No Supabase migration or paid services are needed. Run `npm run test:fair` (optionally set `BROWSER_EXECUTABLE`) after `npm run build`; screenshots are saved under `/tmp/navait-fair-qa`.
