import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const servers = [];
let browser;
async function server(port, online = false) {
  const child = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    {
      env: {
        ...process.env,
        VITE_SUPABASE_URL: online ? "https://navait-test.supabase.co" : "",
        VITE_SUPABASE_PUBLISHABLE_KEY: online
          ? "sb_publishable_mock_for_tests_only"
          : "",
      },
      stdio: "pipe",
    },
  );
  servers.push(child);
  let output = "";
  child.stderr.on("data", (data) => (output += data));
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}`)).ok) return;
    } catch {}
    if (child.exitCode !== null) throw Error(output);
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Test server did not start");
}
async function fixture(page, width = 2400, height = 1600) {
  return Buffer.from(
    await page.evaluate(
      ({ width, height }) => {
        const c = document.createElement("canvas");
        c.width = width;
        c.height = height;
        const x = c.getContext("2d");
        const g = x.createLinearGradient(0, 0, width, height);
        g.addColorStop(0, "#ee8866");
        g.addColorStop(0.5, "#4477aa");
        g.addColorStop(1, "#66bb77");
        x.fillStyle = g;
        x.fillRect(0, 0, width, height);
        x.fillStyle = "#ffffff";
        x.beginPath();
        x.arc(width / 2, height / 2, height / 5, 0, Math.PI * 2);
        x.fill();
        return c.toDataURL("image/png").split(",")[1];
      },
      { width, height },
    ),
    "base64",
  );
}
async function crop(page, buffer) {
  await page
    .locator("#profile-file")
    .setInputFiles({ name: "landscape.png", mimeType: "image/png", buffer });
  await page.locator("#crop-dialog").waitFor({ state: "visible" });
  const initial = await page
    .locator("#crop-canvas")
    .evaluate((c) => c.toDataURL());
  await page.locator("#crop-zoom").fill("2");
  await page.locator('[data-pan="-1,0"]').click();
  assert.notEqual(
    await page.locator("#crop-canvas").evaluate((c) => c.toDataURL()),
    initial,
  );
  const box = await page.locator("#crop-canvas").boundingBox();
  await page.mouse.move(box.x + 160, box.y + 160);
  await page.mouse.down();
  await page.mouse.move(box.x + 115, box.y + 130, { steps: 4 });
  await page.mouse.up();
  await page.locator("#crop-save").click();
  await page.locator("#crop-dialog").waitFor({ state: "hidden" });
  const url = await page.locator("#profile-preview").getAttribute("src");
  assert.ok(url.startsWith("data:image/jpeg;base64,"));
  assert.ok(Buffer.from(url.split(",")[1], "base64").length < 60000);
  assert.deepEqual(
    await page
      .locator("#profile-preview")
      .evaluate((i) => [i.naturalWidth, i.naturalHeight]),
    [256, 256],
  );
  return url;
}
try {
  await mkdir("/tmp/navait-profile-qa", { recursive: true });
  await server(5180);
  await server(5181, true);
  browser = await chromium.launch({
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : {}),
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await context.addInitScript(() => {
    window.__audioContexts = [];
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(...args) {
        super(...args);
        window.__audioContexts.push(this);
        this.__oscillators = 0;
      }
      createOscillator() {
        this.__oscillators++;
        return super.createOscillator();
      }
      createDynamicsCompressor() {
        const node = super.createDynamicsCompressor();
        const connect = node.connect.bind(node);
        const analyser = this.createAnalyser();
        this.__analyser = analyser;
        node.connect = (destination) => {
          connect(analyser);
          analyser.connect(destination);
          return destination;
        };
        return node;
      }
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:5180");
  await page.locator(".choice img").first().waitFor();
  assert.equal(await page.locator(".demo-note,.river-note,#count").count(), 0);
  assert.equal(await page.evaluate(() => window.__audioContexts.length), 0);
  await page.locator("#sound-toggle").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#sound-toggle").getAttribute("aria-pressed") ===
      "true",
  );
  await page.waitForFunction(() => {
    const ctx = window.__audioContexts[0];
    const samples = new Float32Array(512);
    ctx.__analyser.getFloatTimeDomainData(samples);
    return samples.some((x) => Math.abs(x) > 0.00001);
  });
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForFunction(
    () => window.__audioContexts[0].state === "suspended",
  );
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForFunction(
    () => window.__audioContexts[0].state === "running",
  );
  const image = await fixture(page);
  const selected = await crop(page, image);
  await page.locator("#profile-file").setInputFiles({
    name: "portrait.png",
    mimeType: "image/png",
    buffer: await fixture(page, 1600, 2400),
  });
  await page.locator("#crop-dialog").waitFor({ state: "visible" });
  await page.screenshot({ path: "/tmp/navait-profile-qa/crop-mobile.png" });
  await page.keyboard.press("Escape");
  assert.equal(
    await page.locator("#profile-preview").getAttribute("src"),
    selected,
  );
  await page.locator("#profile-file").setInputFiles({
    name: "broken.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await page.waitForFunction(
    () => document.querySelector("#photo-status").textContent !== "กำลังเปิดรูป…",
  );
  assert.equal(
    await page.locator("#profile-preview").getAttribute("src"),
    selected,
  );
  await page.locator("#name").fill("ดาวน้อย");
  await page.locator("#wish").fill("ขอให้ทุกวันสดใส");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const oscillatorsBefore = await page.evaluate(
    () => window.__audioContexts[0].__oscillators,
  );
  await page.locator("button[type=submit]").click();
  await page.locator("#after").waitFor({ state: "visible" });
  await page.locator('#river[data-launch-effect="active"]').waitFor();
  assert.ok(
    (await page.evaluate(() => window.__audioContexts[0].__oscillators)) >=
      oscillatorsBefore + 3,
  );
  await page.screenshot({
    path: "/tmp/navait-profile-qa/launch-effect-mobile.png",
  });
  await page
    .locator("#river[data-launch-effect]")
    .waitFor({ state: "detached", timeout: 20000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("#sound-toggle").click();
  await page.waitForFunction(
    () => window.__audioContexts[0].state === "suspended",
  );
  assert.equal(
    await page.locator("#sound-toggle").getAttribute("aria-pressed"),
    "false",
  );
  assert.equal(await page.locator(".boat-label img").count(), 0);
  await page
    .getByRole("button", { name: "คำอธิษฐานของ ดาวน้อย", exact: true })
    .click();
  await page.locator("dialog[open] #dialog-avatar").waitFor();
  assert.equal(
    await page.locator("#dialog-avatar").getAttribute("src"),
    selected,
  );
  await page.screenshot({ path: "/tmp/navait-profile-qa/wish-mobile.png" });
  await page.keyboard.press("Escape");
  await page.reload();
  await page
    .getByRole("button", { name: "คำอธิษฐานของ ดาวน้อย", exact: true })
    .click();
  assert.equal(
    await page.locator("#dialog-avatar").getAttribute("src"),
    selected,
  );
  await page.keyboard.press("Escape");
  await page.locator("#name").fill("ไม่มีรูป");
  await page.locator("button[type=submit]").click();
  await page
    .getByRole("button", { name: "คำอธิษฐานของ ไม่มีรูป", exact: true })
    .click();
  assert.ok(
    (await page.locator("#dialog-avatar").getAttribute("src")).startsWith(
      "data:image/png",
    ),
  );
  await page.keyboard.press("Escape");
  await page.locator("#again").click();
  await page.locator("#profile-file").setInputFiles({
    name: "landscape.png",
    mimeType: "image/png",
    buffer: image,
  });
  await page.locator("#crop-dialog").waitFor({ state: "visible" });
  await page.locator("#crop-save").click();
  await page.locator("#crop-dialog").waitFor({ state: "hidden" });
  await page.locator("#remove-photo").click();
  assert.ok(
    (await page.locator("#profile-preview").getAttribute("src")).startsWith(
      "data:image/png",
    ),
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS local: crop zoom/drag/pan, portrait, cancel/Escape, invalid image, compression, saved photo, fallback avatar, no floating photo, reload, remove, mobile layout",
  );
  await context.close();
  // Mock the service boundary, not the game's UI or renderer. No live credentials needed.
  const online = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await online.addInitScript(() => {
    window.__copied = "";
    window.__nativeShare = null;
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.__copied = value;
        },
      },
    });
  });
  const rows = [],
    uploads = new Map();
  let downloads = 0,
    failInsert = false,
    failUpload = false,
    removed = 0;
  const owner = "11111111-1111-4111-8111-111111111111";
  const now = Math.floor(Date.now() / 1000);
  const token =
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ) +
    "." +
    Buffer.from(
      JSON.stringify({
        sub: owner,
        aud: "authenticated",
        role: "authenticated",
        exp: now + 3600,
        iat: now,
      }),
    ).toString("base64url") +
    ".mock-signature";
  await online.route("https://navait-test.supabase.co/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    const json = (value, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(value),
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
    if (url.pathname === "/auth/v1/signup")
      return json({
        access_token: token,
        refresh_token: "mock-refresh",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: now + 3600,
        user: {
          id: owner,
          aud: "authenticated",
          role: "authenticated",
          is_anonymous: true,
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString(),
        },
      });
    if (url.pathname === "/rest/v1/krathongs") {
      if (req.method() === "GET") {
        const id = url.searchParams.get("id");
        if (id) {
          if (id === "eq.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
            return json({ message: "offline" }, 503);
          return json(rows.filter((row) => row.id === id.slice(3)));
        }
        return json([...rows].reverse().slice(0, 30));
      }
      if (failInsert)
        return json(
          { message: "daily limit: 10 krathongs per user", code: "P0001" },
          400,
        );
      const row = req.postDataJSON();
      rows.push({ ...row, created_at: new Date().toISOString() });
      return route.fulfill({ status: 201, body: "" });
    }
    if (url.pathname.startsWith("/storage/v1/object/public/avatars/")) {
      downloads++;
      const bytes = uploads.get(url.pathname.split("/public/avatars/")[1]);
      return bytes
        ? route.fulfill({ status: 200, contentType: "image/jpeg", body: bytes })
        : route.fulfill({
            status: 200,
            contentType: "image/jpeg",
            body: "invalid image",
          });
    }
    if (url.pathname.startsWith("/storage/v1/object/avatars/")) {
      if (failUpload)
        return json({ message: "upload denied", statusCode: "403" }, 403);
      const body = req.postDataBuffer();
      const start = body.indexOf(Buffer.from([0xff, 0xd8]));
      const end = body.lastIndexOf(Buffer.from([0xff, 0xd9]));
      assert.ok(start >= 0 && end > start);
      const jpeg = body.subarray(start, end + 2);
      assert.ok(jpeg.length < 60000);
      uploads.set(url.pathname.split("/object/avatars/")[1], jpeg);
      return json({ Key: url.pathname, Id: crypto.randomUUID() });
    }
    if (
      url.pathname === "/storage/v1/object/avatars" &&
      req.method() === "DELETE"
    ) {
      removed++;
      for (const prefix of req.postDataJSON().prefixes) uploads.delete(prefix);
      return json([]);
    }
    throw Error(
      `Unexpected service operation: ${req.method()} ${url.pathname}`,
    );
  });
  const p = await online.newPage();
  const onlineErrors = [];
  p.on("pageerror", (e) => onlineErrors.push(e.message));
  await p.goto("http://127.0.0.1:5181");
  await crop(p, image);
  await p.locator("#name").fill("แม่น้ำร่วมกัน");
  await p.locator("#wish").fill("เห็นรูปเมื่อคลิก");
  await p.locator("button[type=submit]").click();
  await p.locator("#after").waitFor({ state: "visible" });
  assert.equal(rows.length, 1);
  assert.equal(uploads.size, 1);
  assert.equal(downloads, 0);
  await p.locator("#share-mine button").click();
  const shareURL = await p.evaluate(() => window.__copied);
  assert.equal(new URL(shareURL).searchParams.get("krathong"), rows[0].id);
  await p.evaluate(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (payload) => {
        window.__nativeShare = payload;
      },
    });
  });
  await p.locator("#share-mine button").click();
  assert.equal((await p.evaluate(() => window.__nativeShare)).url, shareURL);
  await p.evaluate(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        throw new DOMException("Cancelled", "AbortError");
      },
    });
  });
  await p.locator("#share-mine button").click();
  assert.equal(
    await p.locator("#share-mine [data-share-status]").textContent(),
    "",
  );
  await p.evaluate(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw Error("denied");
        },
      },
    });
  });
  await p.locator("#share-mine button").click();
  await p.locator("#share-mine input").waitFor({ state: "visible" });
  assert.equal(await p.locator("#share-mine input").inputValue(), shareURL);

  await p
    .getByRole("button", { name: "คำอธิษฐานของ แม่น้ำร่วมกัน", exact: true })
    .click();
  await p.waitForFunction(() => {
    const i = document.querySelector("#dialog-avatar");
    return i.complete && i.naturalWidth === 256;
  });
  assert.equal(downloads, 1);
  await p.keyboard.press("Escape");
  const visitor = await online.newPage();
  await visitor.goto("http://127.0.0.1:5181");
  await visitor
    .getByRole("button", { name: "คำอธิษฐานของ แม่น้ำร่วมกัน", exact: true })
    .waitFor();
  await visitor.close();
  await p.locator("#again").click();
  await p.locator("#name").fill("ลองส่งใหม่");
  failInsert = true;
  await p.locator("button[type=submit]").click();
  await p.waitForFunction(() =>
    document.querySelector("#launch-status").textContent.includes("ครบ 10"),
  );
  assert.equal(removed, 1);
  assert.equal(await p.locator("button[type=submit]").isEnabled(), true);
  assert.equal(await p.locator("#name").inputValue(), "ลองส่งใหม่");
  failInsert = false;
  failUpload = true;
  await p.locator("button[type=submit]").click();
  await p.waitForFunction(() =>
    document.querySelector("#launch-status").textContent.includes("ไม่สำเร็จ"),
  );
  assert.equal(rows.length, 1);
  assert.deepEqual(onlineErrors, []);
  const old = rows[0];
  for (let i = 0; i < 35; i++)
    rows.push({
      ...old,
      id: crypto.randomUUID(),
      name: `ใหม่ ${i}`,
      avatar_path: null,
    });
  const linked = await online.newPage();
  const linkErrors = [];
  linked.on("pageerror", (e) => linkErrors.push(e.message));
  await linked.goto(shareURL);
  await linked.locator("#wish-dialog[open]").waitFor();
  assert.ok(
    (await linked.locator("#dialog-name").textContent()).includes(old.name),
  );
  await linked.keyboard.press("Escape");
  await linked.locator(".boat-label.is-focused").waitFor();
  await linked.screenshot({ path: "/tmp/navait-profile-qa/shared-mobile.png" });
  await linked.locator("#join-river").click();
  assert.equal(new URL(linked.url()).searchParams.has("krathong"), false);
  await linked.locator("#ritual").waitFor({ state: "visible" });
  await linked.goto("http://127.0.0.1:5181/?krathong=" + crypto.randomUUID());
  await linked.waitForFunction(() =>
    document.querySelector("#shared-message").textContent.includes("ไม่พบกระทง"),
  );
  await linked.goto("http://127.0.0.1:5181/?krathong=invalid");
  await linked.waitForFunction(() =>
    document.querySelector("#shared-message").textContent.includes("ไม่ถูกต้อง"),
  );
  await linked.goto(
    "http://127.0.0.1:5181/?krathong=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  );
  await linked.locator("#retry-shared").waitFor({ state: "visible" });
  assert.deepEqual(linkErrors, []);
  await linked.close();
  console.log(
    "PASS ambience/sharing: no autoplay; real audio signal; background suspend/resume; chime; bounded launch effect; toggle off; removed text; clipboard/native/cancel/manual sharing; direct old/missing/invalid/unavailable links",
  );
  await online.close();
  console.log(
    "PASS mocked online: anonymous session, compressed upload, shared river, photo fetched only on click, failed insert cleanup, upload failure and retry UI",
  );
} finally {
  await browser?.close();
  for (const server of servers) server.kill("SIGTERM");
}
