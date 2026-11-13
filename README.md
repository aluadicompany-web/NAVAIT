# NAVAIT — คืนลอยกระทง

A small Thai-language Loy Krathong browser game built with Phaser, TypeScript and Vite.

## Run

Use Node.js 24 and npm. From this checkout:

```sh
npm ci --cache /tmp/navait-npm-cache
npm run dev -- --port 5173
```

Production validation: `npm run build`. Serve the output with `npm run preview`.

Players enter a nickname, an optional wish, and choose one of three flower colors. Launching creates an animated krathong with the nickname above it. Tap a krathong to read its wish. Up to 30 krathongs persist in this browser's local storage.

This prototype uses nickname entry, not authenticated accounts. It does not share data between players or devices. Google sign-in and a shared river require a backend and identity-provider configuration.

The river and krathongs are drawn locally with Phaser graphics. No external image, font, or API service is required. Reduced-motion preferences disable decorative boat movement.
