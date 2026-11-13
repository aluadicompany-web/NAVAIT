/** Locally synthesized ambience: no downloads, autoplay, or per-frame audio work. */
export class Ambience {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private sources: AudioScheduledSourceNode[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private enabled = false;
  private scenePaused = false;
  private busy = false;
  constructor(
    private button: HTMLButtonElement,
    private status: HTMLElement,
  ) {
    button.addEventListener("click", () => void this.toggle());
    document.addEventListener("visibilitychange", this.visibility);
  }
  private build() {
    const context = new AudioContext({ latencyHint: "playback" });
    this.context = context;
    const master = context.createGain();
    master.gain.value = 0;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -18;
    limiter.ratio.value = 4;
    master.connect(limiter);
    limiter.connect(context.destination);
    this.master = master;
    const buffer = context.createBuffer(
      1,
      context.sampleRate * 8,
      context.sampleRate,
    );
    const samples = buffer.getChannelData(0);
    let smooth = 0;
    for (let i = 0; i < samples.length; i++) {
      smooth = 0.97 * smooth + 0.03 * (Math.random() * 2 - 1);
      samples[i] = smooth * 5;
    }
    const water = context.createBufferSource();
    water.buffer = buffer;
    water.loop = true;
    const waterFilter = context.createBiquadFilter();
    waterFilter.type = "lowpass";
    waterFilter.frequency.value = 1300;
    const waterGain = context.createGain();
    waterGain.gain.value = 0.3;
    water.connect(waterFilter);
    waterFilter.connect(waterGain);
    waterGain.connect(master);
    water.start();
    const wind = context.createBufferSource();
    wind.buffer = buffer;
    wind.loop = true;
    wind.playbackRate.value = 0.52;
    const windFilter = context.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 360;
    const windGain = context.createGain();
    windGain.gain.value = 0.1;
    wind.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    wind.start();
    const lfo = context.createOscillator();
    lfo.frequency.value = 0.085;
    const depth = context.createGain();
    depth.gain.value = 0.055;
    lfo.connect(depth);
    depth.connect(waterGain.gain);
    lfo.start();
    this.sources.push(water, wind, lfo);
  }
  private async toggle() {
    if (this.busy) return;
    this.busy = true;
    try {
      if (!this.enabled) {
        if (!this.context) this.build();
        // Resume directly from a user gesture, including mobile Safari.
        await this.context!.resume();
        if (this.context!.state !== "running") throw Error("audio suspended");
        this.enabled = true;
        this.fade(0.45);
        this.startNature();
      } else {
        this.enabled = false;
        this.stopNature();
        this.fade(0);
        await this.context!.suspend();
      }
      this.update();
      this.status.textContent = "";
    } catch {
      this.enabled = false;
      this.stopNature();
      void this.context?.suspend();
      this.update();
      this.status.textContent = "เปิดเสียงไม่ได้ ลองแตะปุ่มเสียงอีกครั้ง";
    } finally {
      this.busy = false;
    }
  }
  private fade(value: number) {
    if (!this.context || !this.master) return;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(value, this.context.currentTime, 0.3);
  }
  private update() {
    this.button.setAttribute("aria-pressed", String(this.enabled));
    this.button.setAttribute(
      "aria-label",
      this.enabled ? "ปิดเสียงบรรยากาศ" : "เปิดเสียงบรรยากาศ",
    );
    this.button.querySelector("span")!.textContent = this.enabled
      ? "ปิดเสียง"
      : "เปิดเสียง";
  }
  private startNature() {
    this.stopNature();
    this.timer = setInterval(() => this.chirp(), 12000);
  }
  private stopNature() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
  private chirp() {
    if (
      !this.enabled ||
      !this.context ||
      !this.master ||
      this.context.state !== "running"
    )
      return;
    const time = this.context.currentTime;
    for (let i = 0; i < 2; i++) {
      const oscillator = this.context.createOscillator(),
        gain = this.context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(1700 + i * 240, time + i * 0.21);
      oscillator.frequency.exponentialRampToValueAtTime(
        2600 + i * 180,
        time + i * 0.21 + 0.09,
      );
      gain.gain.setValueAtTime(0, time + i * 0.21);
      gain.gain.linearRampToValueAtTime(0.018, time + i * 0.21 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + i * 0.21 + 0.16);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(time + i * 0.21);
      oscillator.stop(time + i * 0.21 + 0.18);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    }
  }
  playLaunch() {
    if (
      !this.enabled ||
      !this.context ||
      !this.master ||
      this.context.state !== "running"
    )
      return;
    const context = this.context,
      time = context.currentTime;
    for (const [index, frequency] of [523.25, 659.25, 783.99].entries()) {
      const oscillator = context.createOscillator(),
        gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      const start = time + index * 0.11;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.07, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.3);
      oscillator.connect(gain);
      gain.connect(this.master!);
      oscillator.start(start);
      oscillator.stop(start + 1.4);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    }
  }
  private visibility = async () => {
    if (!this.enabled || !this.context || this.scenePaused) return;
    if (document.hidden) {
      this.stopNature();
      await this.context.suspend().catch(() => {});
    } else {
      try {
        await this.context.resume();
        if (this.context.state !== "running") throw Error("suspended");
        this.startNature();
      } catch {
        this.enabled = false;
        this.update();
        this.status.textContent = "แตะเปิดเสียงเพื่อฟังต่อ";
      }
    }
  };
  async setScenePaused(paused: boolean) {
    this.scenePaused = paused;
    try {
      if (paused) {
        this.stopNature();
        await this.context?.suspend();
      } else if (this.enabled && this.context && !document.hidden) {
        await this.context.resume();
        this.startNature();
      }
    } catch {
      this.enabled = false;
      this.stopNature();
      this.update();
      this.status.textContent = "แตะเปิดเสียงเพื่อฟังต่อ";
    }
  }
  dispose() {
    document.removeEventListener("visibilitychange", this.visibility);
    this.stopNature();
    this.sources.forEach((s) => s.stop());
    void this.context?.close();
  }
}
