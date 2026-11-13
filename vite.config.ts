import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    // The temple loads lazily; prebundle its geometry helper at startup so the
    // first visit in a fresh dev session does not trigger a page reload.
    include: ["three/addons/geometries/RoundedBoxGeometry.js"],
  },
});
