const text = "นะโม ตัสสะ ภะคะวะโต อะระหะโต สัมมาสัมพุทธัสสะ";
/** Spoken Thai recitation, not a recording of monks. No audio starts automatically. */
export class Chant {
  private enabled = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;
  constructor(
    private button: HTMLButtonElement,
    private status: HTMLElement,
  ) {
    button.addEventListener("click", () =>
      this.enabled ? this.stop() : this.start(),
    );
    document.addEventListener("visibilitychange", this.visibility);
  }
  private start() {
    if (!("speechSynthesis" in window)) {
      this.status.textContent = "อุปกรณ์นี้ไม่รองรับเสียงอ่านบทสวด";
      return;
    }
    const voices = speechSynthesis.getVoices();
    const thai = voices.find((v) => v.lang.toLowerCase().startsWith("th"));
    if (voices.length && !thai) {
      this.status.textContent = "กรุณาเพิ่มเสียงอ่านภาษาไทยในอุปกรณ์เพื่อฟังบทสวด";
      return;
    }
    this.enabled = true;
    this.button.setAttribute("aria-pressed", "true");
    this.button.textContent = "ปิดเสียงอ่านบทสวด";
    this.status.textContent = "";
    this.speak(thai);
  }
  private speak(voice?: SpeechSynthesisVoice) {
    if (!this.enabled || document.hidden) return;
    const generation = ++this.generation;
    const utterance = new SpeechSynthesisUtterance(
      [text, text, text].join(" … "),
    );
    utterance.lang = "th-TH";
    utterance.rate = 0.72;
    utterance.pitch = 0.85;
    utterance.volume = 0.55;
    if (voice) utterance.voice = voice;
    utterance.onstart = () => {
      if (this.watchdog) clearTimeout(this.watchdog);
      this.watchdog = null;
    };
    utterance.onend = () => {
      if (this.enabled && generation === this.generation)
        this.timer = setTimeout(() => this.speak(voice), 2000);
    };
    utterance.onerror = () => {
      if (generation !== this.generation) return;
      this.stop();
      this.status.textContent =
        "เปิดเสียงอ่านไม่ได้ ตรวจว่าอุปกรณ์มีเสียงภาษาไทยแล้วลองอีกครั้ง";
    };
    speechSynthesis.speak(utterance);
    this.watchdog = setTimeout(() => {
      if (
        this.enabled &&
        generation === this.generation &&
        !speechSynthesis.speaking
      ) {
        this.stop();
        this.status.textContent =
          "อุปกรณ์ยังไม่มีเสียงอ่านภาษาไทย กรุณาเพิ่มเสียงภาษาไทยในระบบ";
      }
    }, 4000);
  }
  stop() {
    this.enabled = false;
    this.generation++;
    if (this.timer) clearTimeout(this.timer);
    if (this.watchdog) clearTimeout(this.watchdog);
    this.timer = this.watchdog = null;
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    this.button.setAttribute("aria-pressed", "false");
    this.button.textContent = "ฟังบทสวด";
  }
  private visibility = () => {
    if (document.hidden) this.stop();
  };
  dispose() {
    this.stop();
    document.removeEventListener("visibilitychange", this.visibility);
  }
}
