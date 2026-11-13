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

## Limits

This prototype uses nickname entry, not authenticated accounts. It does not share data between players or devices. Google sign-in and a shared river require a backend and identity-provider configuration.

A WebGL2-capable browser is required. A visible error explains when 3D initialization fails; launching is disabled in that case. No external image, font, model or API service is required.

## Browser validation

Check every design preview and launch each variant. Verify names and wishes, rightward drift, animated water and candlelight, refresh persistence, old-format save migration, mobile layout without horizontal overflow, and reduced-motion behavior. Test real mobile hardware before making performance guarantees.
