/** Default-on river music; browser autoplay blocks retry on a page interaction. */
const MUTE_PREFERENCE = "navait.music.muted.v1";
export const MUSIC_VIDEO_ID = "95s3Y8nVMV4";
export const MUSIC_URL = `https://www.youtube.com/watch?v=${MUSIC_VIDEO_ID}`;

type Player = {
  playVideo(): void;
  pauseVideo(): void;
  setVolume(volume: number): void;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
};
type PlayerEvent = { target: Player };
type PlayerOptions = {
  width: number;
  height: number;
  host: string;
  videoId: string;
  playerVars: Record<string, number | string>;
  events: {
    onReady(event: PlayerEvent): void;
    onStateChange(event: PlayerEvent & { data: number }): void;
    onError(event: PlayerEvent & { data: number }): void;
    onAutoplayBlocked(event: PlayerEvent): void;
  };
};
type YouTubeAPI = { Player: new (element: HTMLElement, options: PlayerOptions) => Player };
declare global {
  interface Window {
    YT?: YouTubeAPI;
    onYouTubeIframeAPIReady?: () => void;
  }
}
let apiPromise: Promise<YouTubeAPI> | null = null;
function loadAPI(): Promise<YouTubeAPI> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YouTubeAPI>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    const previous = window.onYouTubeIframeAPIReady;
    const cleanup = () => {
      clearTimeout(timer);
      script.onerror = null;
      if (window.onYouTubeIframeAPIReady === ready)
        window.onYouTubeIframeAPIReady = previous;
    };
    const fail = () => {
      cleanup();
      script.remove();
      apiPromise = null;
      reject(Error("YouTube player unavailable"));
    };
    const ready = () => {
      cleanup();
      if (!window.YT?.Player) { fail(); return; }
      resolve(window.YT);
      previous?.();
    };
    const timer = setTimeout(fail, 15000);
    window.onYouTubeIframeAPIReady = ready;
    script.onerror = fail;
    document.head.append(script);
  });
  return apiPromise;
}

export class RiverMusic {
  private player: Player | null = null;
  private requested = false;
  private ready = false;
  private scenePaused = false;
  private generation = 0;
  private wantsPlayback = false;
  private waitingForGesture = false;
  private lastState = -1;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private status: HTMLElement;
  private slot: HTMLElement;
  private retry: HTMLButtonElement;
  private closeButton: HTMLButtonElement;

  constructor(private button: HTMLButtonElement, private panel: HTMLElement) {
    panel.innerHTML = `<div class="music-heading"><h2>เพลงประกอบคืนลอยกระทง</h2><button type="button" class="music-close" aria-label="ปิดเพลงและตัวเล่น">×</button></div><div class="music-player-slot"></div><p class="music-status" role="status"></p><div class="music-footer"><a href="${MUSIC_URL}" target="_blank" rel="noopener noreferrer">ฟังบน YouTube ↗</a><button type="button" class="music-retry" hidden>ลองเปิดเพลงอีกครั้ง</button></div>`;
    this.status = panel.querySelector(".music-status")!;
    this.slot = panel.querySelector(".music-player-slot")!;
    this.retry = panel.querySelector(".music-retry")!;
    this.closeButton = panel.querySelector(".music-close")!;
    button.addEventListener("click", this.toggle);
    this.closeButton.addEventListener("click", this.close);
    this.retry.addEventListener("click", this.open);
    document.addEventListener("visibilitychange", this.visibility);
    window.addEventListener("pagehide", this.pageHide);
    document.addEventListener("click", this.interaction, { capture: true, passive: true });
    document.addEventListener("keydown", this.interaction, true);
    this.update(false);
    let muted = false;
    try { muted = localStorage.getItem(MUTE_PREFERENCE) === "true"; } catch {}
    if (!muted) void this.open();
  }
  private canPlay() {
    return this.requested && !this.scenePaused && !document.hidden;
  }
  private update(playing: boolean) {
    this.button.setAttribute("aria-expanded", String(this.requested));
    this.button.setAttribute("aria-pressed", String(playing));
    this.button.setAttribute("aria-label", this.requested ? "ปิดเพลงประกอบ" : "เปิดเพลงประกอบ");
    this.button.querySelector("span")!.textContent = this.requested ? "ปิดเพลง" : "เปิดเพลง";
    this.panel.hidden = !this.requested;
    if (!this.requested) this.panel.dataset.state = "off";
  }
  private rememberMute(muted: boolean) {
    try { localStorage.setItem(MUTE_PREFERENCE, String(muted)); } catch {}
  }
  private toggle = () => {
    if (this.requested) this.close();
    else { this.rememberMute(false); void this.open(); }
  };
  private interaction = (event: Event) => {
    if (!event.isTrusted || !this.waitingForGesture || !this.wantsPlayback || !this.ready || !this.canPlay()) return;
    if (event.target instanceof Element && event.target.closest("#music-toggle,.music-close,.music-retry")) return;
    if (event instanceof KeyboardEvent && (event.repeat || ["Escape", "Shift", "Control", "Alt", "Meta"].includes(event.key))) return;
    // Retry synchronously inside the trusted interaction, including typing a name.
    this.waitingForGesture = false;
    this.player?.playVideo();
  };
  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
  private fail(message: string) {
    this.clearTimer();
    this.generation++;
    this.ready = false;
    this.wantsPlayback = false;
    this.waitingForGesture = false;
    this.player?.destroy();
    this.player = null;
    this.slot.replaceChildren();
    this.slot.hidden = true;
    this.panel.dataset.state = "error";
    this.status.textContent = message;
    this.retry.hidden = false;
    this.update(false);
  }
  private open = async () => {
    const generation = ++this.generation;
    this.clearTimer();
    this.player?.destroy();
    this.player = null;
    this.ready = false;
    this.requested = true;
    this.wantsPlayback = true;
    this.waitingForGesture = false;
    this.lastState = -1;
    this.slot.replaceChildren();
    this.slot.hidden = false;
    this.retry.hidden = true;
    this.panel.dataset.state = "loading";
    this.status.textContent = "กำลังเปิดเพลงจาก YouTube…";
    this.update(false);
    try {
      const api = await loadAPI();
      if (generation !== this.generation || !this.requested) return;
      const mount = document.createElement("div");
      this.slot.append(mount);
      this.timer = setTimeout(() => {
        if (generation === this.generation)
          this.fail("โหลดเพลงไม่สำเร็จ ลองใหม่หรือเปิดฟังบน YouTube");
      }, 15000);
      this.player = new api.Player(mount, {
        width: 320,
        height: 200,
        host: "https://www.youtube-nocookie.com",
        videoId: MUSIC_VIDEO_ID,
        playerVars: {
          // Start via playVideo after setting a gentle volume in onReady.
          autoplay: 0, controls: 1, playsinline: 1, rel: 0,
          loop: 1, playlist: MUSIC_VIDEO_ID, origin: location.origin,
        },
        events: {
          onReady: ({ target }) => {
            if (generation !== this.generation || !this.requested) return;
            this.clearTimer();
            this.player = target;
            this.ready = true;
            const frame = target.getIframe();
            frame.title = "เพลงประกอบคืนลอยกระทงจาก YouTube";
            frame.referrerPolicy = "strict-origin-when-cross-origin";
            target.setVolume(25);
            frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
            this.status.textContent = "กำลังเริ่มเพลง…";
            this.reconcile();
          },
          onStateChange: ({ target, data }) => {
            if (generation !== this.generation || !this.requested) return;
            if (data === 1 && !this.canPlay()) { target.pauseVideo(); return; }
            if (data === 2 && this.canPlay() && (this.lastState === 1 || this.lastState === 3)) {
              this.wantsPlayback = false;
              this.waitingForGesture = false;
            }
            const playing = data === 1;
            if (playing) {
              this.wantsPlayback = true;
              this.waitingForGesture = false;
            }
            this.lastState = data;
            this.panel.dataset.state = playing ? "playing" : "paused";
            if (playing) this.status.textContent = "";
            this.update(playing);
          },
          onError: ({ data }) => {
            if (generation !== this.generation || !this.requested) return;
            this.ready = false;
            this.fail(data === 101 || data === 150
              ? "วิดีโอนี้ไม่อนุญาตให้เล่นบนเว็บอื่น เปิดฟังบน YouTube ได้"
              : "เล่นเพลงไม่ได้ ลองใหม่หรือเปิดฟังบน YouTube");
          },
          onAutoplayBlocked: () => {
            if (generation !== this.generation || !this.requested) return;
            this.waitingForGesture = true;
            this.panel.dataset.state = "blocked";
            this.status.textContent = "เบราว์เซอร์พักเสียงไว้ แตะหรือคลิกที่หน้าเว็บเพื่อเริ่มเพลง";
            this.update(false);
          },
        },
      });
    } catch {
      if (generation === this.generation && this.requested)
        this.fail("เชื่อมต่อ YouTube ไม่สำเร็จ ลองใหม่หรือเปิดฟังบน YouTube");
    }
  };
  private reconcile() {
    if (!this.player || !this.ready) return;
    if (this.canPlay() && this.wantsPlayback) this.player.playVideo();
    else { this.player.pauseVideo(); this.update(false); }
  }
  private visibility = () => this.reconcile();
  setScenePaused(paused: boolean) {
    this.scenePaused = paused;
    this.reconcile();
  }
  private close = () => {
    this.rememberMute(true);
    this.stop();
    if (!document.hidden) this.button.focus({ preventScroll: true });
  };
  private pageHide = () => this.stop();
  private stop() {
    this.generation++;
    this.clearTimer();
    this.requested = false;
    this.wantsPlayback = false;
    this.waitingForGesture = false;
    this.ready = false;
    this.player?.destroy();
    this.player = null;
    this.slot.replaceChildren();
    this.status.textContent = "";
    this.update(false);
  }
  dispose() {
    this.stop();
    this.button.removeEventListener("click", this.toggle);
    this.closeButton.removeEventListener("click", this.close);
    this.retry.removeEventListener("click", this.open);
    document.removeEventListener("visibilitychange", this.visibility);
    window.removeEventListener("pagehide", this.pageHide);
    document.removeEventListener("click", this.interaction, true);
    document.removeEventListener("keydown", this.interaction, true);
  }
}
