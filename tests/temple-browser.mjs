import { chromium } from "playwright";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const child = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "5184",
    "--strictPort",
  ],
  {
    env: {
      ...process.env,
      VITE_SUPABASE_URL: "https://navait-test.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_mock_for_tests_only",
    },
    stdio: "ignore",
  },
);
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch("http://127.0.0.1:5184")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  await mkdir("/tmp/navait-temple-qa", { recursive: true });
  browser = await chromium.launch({
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : {}),
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const rows = [],
    sockets = new Set(),
    state = new Map();
  let tracks = 0;
  const send = (socket, event, payload, ref = null) => {
    socket.route.send(
      JSON.stringify([socket.joinRef, ref, socket.topic, event, payload]),
    );
  };
  const sync = () => {
    const snapshot = {};
    for (const [key, value] of state)
      snapshot[key] = { metas: [{ ...value, phx_ref: crypto.randomUUID() }] };
    for (const s of sockets) if (s.topic) send(s, "presence_state", snapshot);
  };
  const errors = [];
  async function client(name, width = 390) {
    const context = await browser.newContext({
      viewport: { width, height: width < 760 ? 844 : 900 },
      reducedMotion: "reduce",
    });
    await context.addInitScript(() => {
      window.__chants = [];
      const engine = {
        speaking: false,
        getVoices: () => [],
        speak(u) {
          window.__chants.push({ text: u.text, lang: u.lang });
          engine.speaking = true;
          setTimeout(() => u.onstart?.({}), 0);
        },
        cancel() {
          engine.speaking = false;
        },
      };
      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: engine,
      });
    });
    await context.route("https://navait-test.supabase.co/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url());
      const json = (data, status = 200) =>
        route.fulfill({
          status,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify(data),
        });
      if (req.method() === "OPTIONS")
        return route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-headers": "*",
            "access-control-allow-methods": "*",
          },
        });
      if (url.pathname === "/auth/v1/signup") {
        const id = crypto.randomUUID(),
          now = Math.floor(Date.now() / 1000),
          token =
            Buffer.from(JSON.stringify({ alg: "HS256" })).toString(
              "base64url",
            ) +
            "." +
            Buffer.from(
              JSON.stringify({
                sub: id,
                exp: now + 3600,
                role: "authenticated",
              }),
            ).toString("base64url") +
            ".test";
        return json({
          access_token: token,
          refresh_token: "mock-refresh",
          token_type: "bearer",
          expires_in: 3600,
          user: {
            id,
            aud: "authenticated",
            role: "authenticated",
            is_anonymous: true,
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          },
        });
      }
      if (url.pathname === "/rest/v1/krathongs") {
        if (req.method() === "GET") {
          const id = url.searchParams.get("id");
          return json(
            id
              ? rows.filter((row) => row.id === id.slice(3))
              : [...rows].reverse().slice(0, 30),
          );
        }
        rows.push({
          ...req.postDataJSON(),
          created_at: new Date().toISOString(),
        });
        return route.fulfill({ status: 201, body: "" });
      }
      throw Error("Unexpected API " + url.pathname);
    });
    await context.routeWebSocket(
      "wss://navait-test.supabase.co/**",
      (route) => {
        const socket = { route, topic: null, key: null, joinRef: null };
        sockets.add(socket);
        route.onMessage((raw) => {
          const [joinRef, ref, topic, event, payload] = JSON.parse(
            raw.toString(),
          );
          socket.joinRef = joinRef;
          const reply = () =>
            send(socket, "phx_reply", { status: "ok", response: {} }, ref);
          if (event === "phx_join") {
            socket.topic = topic;
            socket.key = payload.config.presence.key;
            send(
              socket,
              "phx_reply",
              { status: "ok", response: { postgres_changes: [] } },
              ref,
            );
            setTimeout(sync, 10);
          } else if (event === "presence") {
            if (payload.event === "track") {
              tracks++;
              state.set(socket.key, payload.payload);
            } else if (payload.event === "untrack") state.delete(socket.key);
            reply();
            sync();
          } else if (event === "phx_leave") {
            state.delete(socket.key);
            reply();
            sockets.delete(socket);
            sync();
          } else if (event === "heartbeat") {
            route.send(
              JSON.stringify([
                null,
                ref,
                topic,
                "phx_reply",
                { status: "ok", response: {} },
              ]),
            );
          } else if (event === "access_token") {
            if (ref) reply();
          } else throw Error("Unexpected socket event " + event);
        });
        route.onClose(() => {
          state.delete(socket.key);
          sockets.delete(socket);
          sync();
        });
      },
    );
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto("http://127.0.0.1:5184");
    assert.equal(await page.locator(".temple-room").count(), 0);
    await page.locator("#name").fill(name);
    await page.locator("button[type=submit]").click();
    await page.locator("#after").waitFor({ state: "visible" });
    assert.equal(await page.locator(".temple-room").count(), 0);
    await page.locator("#enter-temple").click();
    await page.locator(".temple-room").waitFor();
    return { context, page };
  }
  const a = await client("สายลม", 1440);
  await a.page.waitForFunction(() =>
    document.querySelector("#temple-presence").textContent.includes("1 คน"),
  );
  assert.equal(await a.page.evaluate(() => window.__chants.length), 0);
  const b = await client("แสงดาว");
  await a.page.waitForFunction(
    () => document.querySelectorAll("[data-presence-id]").length === 1,
  );
  await b.page.waitForFunction(
    () => document.querySelectorAll("[data-presence-id]").length === 1,
  );
  assert.ok(
    (await a.page.locator("#temple-presence").textContent()).includes("2 คน"),
  );
  const before = await a.page
    .locator(".temple-room")
    .getAttribute("data-player-x");
  await a.page.keyboard.down("d");
  await a.page.waitForTimeout(700);
  await a.page.keyboard.up("d");
  await a.page.waitForFunction(
    (before) =>
      document.querySelector(".temple-room").dataset.playerX !== before,
    before,
  );
  await a.page.locator("#temple-pray").click();
  await b.page.waitForFunction(
    () =>
      document.querySelector("[data-presence-id]")?.dataset.praying === "true",
  );
  await a.page.locator("#temple-chant").click();
  await a.page.waitForFunction(() => window.__chants.length === 1);
  assert.ok(
    (await a.page.evaluate(() => window.__chants[0].text)).includes("นะโม"),
  );
  assert.equal(await a.page.evaluate(() => window.__chants[0].lang), "th-TH");
  await a.page.screenshot({ path: "/tmp/navait-temple-qa/desktop.png" });
  await b.page.screenshot({ path: "/tmp/navait-temple-qa/mobile.png" });
  assert.equal(
    await b.page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  const idleTracks = tracks;
  await a.page.waitForTimeout(1400);
  assert.ok(
    tracks - idleTracks <= 1,
    "idle client repeatedly publishes presence",
  );
  const beforeMobile = Number(
    await b.page.locator(".temple-room").getAttribute("data-player-z"),
  );
  const arrow = await b.page
    .locator('[data-direction="ArrowUp"]')
    .boundingBox();
  await b.page.mouse.move(
    arrow.x + arrow.width / 2,
    arrow.y + arrow.height / 2,
  );
  await b.page.mouse.down();
  await b.page.waitForTimeout(650);
  await b.page.mouse.up();
  await b.page.waitForFunction(
    (before) =>
      Number(document.querySelector(".temple-room").dataset.playerZ) < before,
    beforeMobile,
  );
  const beforeTap = Number(
    await b.page.locator(".temple-room").getAttribute("data-player-z"),
  );
  await b.page
    .locator("#temple-viewport canvas")
    .click({ position: { x: 195, y: 400 } });
  await b.page.waitForFunction(
    (before) =>
      Number(document.querySelector(".temple-room").dataset.playerZ) < before,
    beforeTap,
  );
  await b.page.evaluate(
    () => (speechSynthesis.getVoices = () => [{ lang: "en-US" }]),
  );
  await b.page.locator("#temple-chant").click();
  assert.ok(
    (await b.page.locator("#temple-audio-status").textContent()).includes(
      "ภาษาไทย",
    ),
  );
  assert.equal(await b.page.evaluate(() => window.__chants.length), 0);
  await a.page.locator("#leave-temple").click();
  await b.page.waitForFunction(
    () => document.querySelectorAll("[data-presence-id]").length === 0,
  );
  assert.equal(await a.page.locator(".temple-room").count(), 0);
  assert.equal(await a.page.evaluate(() => speechSynthesis.speaking), false);
  await a.page.locator("#enter-temple").click();
  await b.page.waitForFunction(
    () => document.querySelectorAll("[data-presence-id]").length === 1,
  );
  await a.context.close();
  await b.page.waitForFunction(
    () => document.querySelectorAll("[data-presence-id]").length === 0,
  );
  assert.deepEqual(errors, []);
  await b.context.close();
  console.log(
    "PASS temple: optional entry; real SDK presence through mocked websocket; two clients join/move/pray; idle throttling; explicit leave/rejoin/disconnect; recitation controls; desktop/mobile render",
  );
} finally {
  await browser?.close();
  child.kill("SIGTERM");
}
