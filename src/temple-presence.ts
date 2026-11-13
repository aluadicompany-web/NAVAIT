import { realtimeClient, loadSharedItem } from "./online";
import { parsePresence, type HallPresence } from "./temple-state";
import type { Krathong } from "./state";
export type HallPeer = { presence: HallPresence; item: Krathong };
export class TemplePresence {
  private channel: ReturnType<ReturnType<typeof realtimeClient>["channel"]>;
  private ready = false;
  private closed = false;
  private lastSend = 0;
  private revision = 0;
  private cached = new Map<string, Krathong>();
  private loading = new Map<string, Promise<Krathong | null>>();
  constructor(
    private own: HallPresence,
    private onPeers: (peers: HallPeer[]) => void,
    private onStatus: (status: string) => void,
  ) {
    this.channel = realtimeClient().channel("navait-temple-v1", {
      config: { presence: { key: own.id } },
    });
    this.channel
      .on("presence", { event: "sync" }, () => void this.sync())
      .subscribe((status) => {
        if (this.closed) return;
        this.ready = status === "SUBSCRIBED";
        if (this.ready) {
          this.onStatus("เชื่อมต่อแล้ว");
          void this.channel
            .track(this.own)
            .catch(() => this.onStatus("กำลังเชื่อมต่อผู้เล่นใหม่…"));
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          this.onPeers([]);
          this.onStatus("กำลังเชื่อมต่อผู้เล่นใหม่…");
        }
      });
  }
  private async sync() {
    const revision = ++this.revision,
      peers: HallPeer[] = [];
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
    if (!this.closed && revision === this.revision) this.onPeers(peers);
  }
  update(x: number, z: number, praying: boolean, force = false) {
    this.own = { ...this.own, x, z, praying };
    if (!this.ready || this.closed) return;
    const now = performance.now();
    if (!force && now - this.lastSend < 750) return;
    this.lastSend = now;
    void this.channel
      .track(this.own)
      .then((result) => {
        if (result !== "ok" && !this.closed)
          this.onStatus("กำลังเชื่อมต่อผู้เล่นใหม่…");
      })
      .catch(() => {
        if (!this.closed) this.onStatus("กำลังเชื่อมต่อผู้เล่นใหม่…");
      });
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.revision++;
    void this.channel
      .untrack()
      .finally(() => realtimeClient().removeChannel(this.channel))
      .catch(() => {});
  }
}
