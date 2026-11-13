import { realtimeClient, loadSharedItem } from "./online";
import { parsePresence, type HallPresence } from "./temple-state";
import type { Krathong } from "./state";
export type HallPeer = { presence: HallPresence; item: Krathong };
export class TemplePresence {
  private channel: ReturnType<ReturnType<typeof realtimeClient>["channel"]> | null = null;
  private ready = false;
  private closed = false;
  private lastSend = 0;
  private revision = 0;
  private generation = 0;
  private retries = 0;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private sendTimer: ReturnType<typeof setTimeout> | undefined;
  private sending = false;
  private dirty = false;
  private cached = new Map<string, Krathong>();
  private loading = new Map<string, Promise<Krathong | null>>();
  constructor(
    private own: HallPresence,
    private onPeers: (peers: HallPeer[]) => void,
    private onStatus: (status: string) => void,
  ) {
    void this.connect();
  }
  private failure(status: string, error?: { message?: string } | null) {
    if (this.closed) return;
    this.ready = false;
    this.onPeers([]);
    const message = error?.message || "";
    const reason = /private|public|permission|authoriz|rls|forbidden/i.test(message)
      ? "Supabase ปฏิเสธสิทธิ์เข้าห้อง · ตรวจการอนุญาต Public channels ใน Realtime"
      : /jwt|token|expir|invalid.*key/i.test(message)
        ? "เซสชันเชื่อมต่อหมดอายุหรือไม่ถูกต้อง · ลองเชื่อมต่อใหม่"
        : /too many|quota|limit|capacity|rate/i.test(message)
          ? "Realtime มีการเชื่อมต่อเกินโควตาชั่วคราว"
          : status === "TIMED_OUT"
            ? "เชื่อมต่อห้องไม่ทันเวลา · ตรวจเครือข่ายหรือ VPN"
            : "เชื่อมต่อ Realtime ไม่สำเร็จ · อาจถูกเครือข่ายบล็อก หรือบริการยังไม่พร้อม";
    this.onStatus(`${reason} (${status}) · กำลังลองใหม่`);
    if (this.retryTimer === undefined) {
      const delay = Math.min(15000, 1500 * 2 ** Math.min(this.retries++, 4));
      this.retryTimer = setTimeout(() => {
        this.retryTimer = undefined;
        void this.connect();
      }, delay);
    }
  }
  private async connect() {
    if (this.closed) return;
    const generation = ++this.generation;
    this.revision++;
    this.ready = false;
    this.sending = false;
    clearTimeout(this.sendTimer);
    this.sendTimer = undefined;
    const old = this.channel;
    this.channel = null;
    try {
      if (old) await realtimeClient().removeChannel(old);
      if (this.closed || generation !== this.generation) return;
      // Bind the current anonymous user's JWT, never the publishable key as a JWT.
      const { data, error } = await realtimeClient().auth.getSession();
      if (error) throw error;
      if (!data.session) {
        this.failure("AUTH_REQUIRED", { message: "JWT session missing" });
        return;
      }
      await realtimeClient().realtime.setAuth(data.session.access_token);
      if (this.closed || generation !== this.generation) return;
      const channel = realtimeClient().channel("navait-temple-v1", {
        config: { private: false, presence: { key: this.own.id, enabled: true } },
      });
      this.channel = channel;
      channel.on("presence", { event: "sync" }, () => {
        if (this.ready && generation === this.generation) void this.sync();
      }).subscribe((status, error) => {
        if (this.closed || generation !== this.generation) return;
        if (status === "SUBSCRIBED") {
          clearTimeout(this.retryTimer);
          this.retryTimer = undefined;
          this.ready = true;
          this.dirty = true;
          void this.send(generation);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          this.failure(status, error);
        }
      });
    } catch {
      if (!this.closed && generation === this.generation) this.failure("CONNECT_ERROR");
    }
  }
  reconnect() {
    if (this.closed) return;
    clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    this.onStatus("กำลังเชื่อมต่อห้องใหม่…");
    void this.connect();
  }
  private async send(generation = this.generation) {
    if (!this.ready || this.closed || this.sending || !this.channel) return;
    this.sending = true;
    this.dirty = false;
    this.lastSend = performance.now();
    const channel = this.channel;
    try {
      const result = await channel.track(this.own);
      if (this.closed || generation !== this.generation) return;
      if (result !== "ok") {
        this.failure(result === "timed out" ? "TIMED_OUT" : "TRACK_ERROR");
        return;
      }
      this.retries = 0;
      this.onStatus("เชื่อมต่อแล้ว");
      void this.sync();
    } catch {
      if (!this.closed && generation === this.generation) this.failure("TRACK_ERROR");
    } finally {
      if (generation === this.generation) {
        this.sending = false;
        if (this.dirty && this.ready) this.scheduleSend();
      }
    }
  }
  private scheduleSend() {
    if (this.sendTimer !== undefined || !this.ready || this.closed || this.sending) return;
    this.sendTimer = setTimeout(() => {
      this.sendTimer = undefined;
      void this.send();
    }, Math.max(0, 750 - (performance.now() - this.lastSend)));
  }
  private async sync() {
    const revision = ++this.revision,
      peers: HallPeer[] = [];
    if (!this.channel || !this.ready) return;
    const state = this.channel.presenceState();
    const valid: HallPresence[] = [];
    for (const [key, entries] of Object.entries(state)) {
      for (const entry of entries) {
        const value = parsePresence(entry);
        if (value && value.id === key && value.id !== this.own.id) {
          valid.push(value);
          break;
        }
      }
    }
    // Presence is ephemeral and untrusted; names/photos come from public saved rows.
    await Promise.all(
      valid.slice(0, 23).map(async (presence) => {
        try {
          let item = this.cached.get(presence.krathongId);
          if (!item) {
            let pending = this.loading.get(presence.krathongId);
            if (!pending) {
              pending = loadSharedItem(presence.krathongId).finally(() =>
                this.loading.delete(presence.krathongId),
              );
              this.loading.set(presence.krathongId, pending);
            }
            item = (await pending) ?? undefined;
            if (item) this.cached.set(item.id, item);
          }
          if (item) peers.push({ presence, item });
        } catch {
          /* A malformed or unavailable participant never blocks the room. */
        }
      }),
    );
    if (!this.closed && this.ready && revision === this.revision) this.onPeers(peers);
  }
  update(x: number, z: number, praying: boolean, force = false) {
    this.own = { ...this.own, x, z, praying };
    if (!this.ready || this.closed) return;
    this.dirty = true;
    if (force && !this.sending) {
      clearTimeout(this.sendTimer);
      this.sendTimer = undefined;
      void this.send();
    } else this.scheduleSend();
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.generation++;
    this.revision++;
    clearTimeout(this.retryTimer);
    clearTimeout(this.sendTimer);
    if (this.channel) void realtimeClient().removeChannel(this.channel).catch(() => {});
    this.channel = null;
  }
}
