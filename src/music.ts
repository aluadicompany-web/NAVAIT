import musicUrl from "./assets/audio/loy-krathong.mp3?url";

const MUTE_PREFERENCE = "navait.music.muted.v1";
export const MUSIC_URL = musicUrl;
type MusicState = "off" | "loading" | "playing" | "paused" | "blocked" | "error";

/** Local background audio: no video, third-party player or external requests. */
export class RiverMusic {
  private audio = document.createElement("audio");
  private enabled = true;
  private scenePaused = false;
  private away = false;
  private disposed = false;
  private waitingForGesture = false;
  private generation = 0;
  private state: MusicState = "off";

  constructor(private button: HTMLButtonElement, private status: HTMLElement) {
    try { this.enabled = localStorage.getItem(MUTE_PREFERENCE) !== "true"; } catch {}
    this.audio.id = "river-music";
    this.audio.hidden = true;
    this.audio.setAttribute("aria-hidden", "true");
    this.audio.preload = "none";
    this.audio.loop = true;
    this.audio.volume = 0.25;
    this.status.after(this.audio);
    this.audio.addEventListener("playing", this.playing);
    this.audio.addEventListener("pause", this.paused);
    this.audio.addEventListener("error", this.failed);
    this.button.addEventListener("click", this.toggle);
    document.addEventListener("click", this.interaction, { capture: true, passive: true });
    document.addEventListener("keydown", this.interaction, true);
    document.addEventListener("visibilitychange", this.visibility);
    window.addEventListener("pagehide", this.pageHide);
    window.addEventListener("pageshow", this.pageShow);
    this.update("off");
    if (this.enabled) this.tryPlay();
  }
  private canPlay() {
    return this.enabled && !this.scenePaused && !document.hidden && !this.away && !this.disposed;
  }
  private update(state: MusicState, message = "") {
    this.state = state;
    this.button.dataset.state = state;
    this.button.setAttribute("aria-pressed", String(state === "playing"));
    this.button.setAttribute("aria-busy", String(state === "loading"));
    this.button.setAttribute("aria-label", state === "error" ? "ลองเปิดเพลงประกอบอีกครั้ง"
      : this.enabled ? "ปิดเพลงประกอบ" : "เปิดเพลงประกอบ");
    this.button.querySelector("span")!.textContent = state === "error" ? "ลองเพลงอีกครั้ง"
      : this.enabled ? "ปิดเพลง" : "เปิดเพลง";
    this.status.textContent = message;
    this.status.hidden = !message;
  }
  private rememberMute() {
    try { localStorage.setItem(MUTE_PREFERENCE, String(!this.enabled)); } catch {}
  }
  private tryPlay() {
    if (!this.canPlay()) return;
    // Keep a muted visitor from fetching the audio at all until they enable it.
    if (!this.audio.getAttribute("src")) this.audio.src = MUSIC_URL;
    if (!this.audio.paused) return;
    const generation = ++this.generation;
    this.waitingForGesture = false;
    this.update("loading");
    // Invoke play synchronously so a trusted tap/key can unlock mobile audio.
    void this.audio.play().then(() => {
      if (!this.canPlay()) { this.audio.pause(); return; }
      if (generation === this.generation && !this.audio.paused) this.playing();
    }).catch((error: unknown) => {
      if (generation !== this.generation || !this.canPlay()) return;
      const name = error instanceof DOMException ? error.name : (error as { name?: string })?.name;
      if (name === "NotAllowedError") {
        this.waitingForGesture = true;
        this.update("blocked", "แตะหรือพิมพ์บนหน้าเว็บเพื่อเริ่มเพลง");
      } else if (name === "AbortError") this.update("paused");
      else this.failed();
    });
  }
  private playing = () => {
    if (!this.canPlay()) { this.audio.pause(); return; }
    this.waitingForGesture = false;
    this.update("playing");
  };
  private paused = () => {
    if (!this.audio.paused || this.disposed) return;
    if (this.state !== "error" && this.state !== "blocked")
      this.update(this.enabled ? "paused" : "off");
  };
  private failed = () => {
    if (this.disposed || !this.enabled) return;
    this.generation++;
    this.waitingForGesture = false;
    this.audio.pause();
    this.update("error", "โหลดเพลงไม่สำเร็จ กดปุ่มเพลงเพื่อลองอีกครั้ง");
  };
  private toggle = () => {
    if (this.state === "error") {
      this.enabled = true;
      this.audio.load();
    } else this.enabled = !this.enabled;
    this.rememberMute();
    this.generation++;
    this.waitingForGesture = false;
    if (this.enabled) this.tryPlay();
    else { this.audio.pause(); this.update("off"); }
  };
  private interaction = (event: Event) => {
    if (!event.isTrusted || !this.waitingForGesture || !this.canPlay()) return;
    if (event.target instanceof Element && event.target.closest("#music-toggle")) return;
    if (event instanceof KeyboardEvent && (event.repeat || ["Escape", "Shift", "Control", "Alt", "Meta"].includes(event.key))) return;
    this.tryPlay();
  };
  private reconcile() {
    if (this.canPlay()) this.tryPlay();
    else { this.generation++; this.audio.pause(); this.update(this.enabled ? "paused" : "off"); }
  }
  private visibility = () => this.reconcile();
  private pageHide = () => { this.away = true; this.reconcile(); };
  private pageShow = () => { this.away = false; this.reconcile(); };
  setScenePaused(paused: boolean) {
    this.scenePaused = paused;
    this.reconcile();
  }
  dispose() {
    this.disposed = true;
    this.generation++;
    this.audio.removeEventListener("playing", this.playing);
    this.audio.removeEventListener("pause", this.paused);
    this.audio.removeEventListener("error", this.failed);
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.audio.remove();
    this.button.removeEventListener("click", this.toggle);
    document.removeEventListener("click", this.interaction, true);
    document.removeEventListener("keydown", this.interaction, true);
    document.removeEventListener("visibilitychange", this.visibility);
    window.removeEventListener("pagehide", this.pageHide);
    window.removeEventListener("pageshow", this.pageShow);
    this.update("off");
  }
}
