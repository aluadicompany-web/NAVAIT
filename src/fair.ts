import type { Krathong } from './state';
import { defaultAvatar } from './profile';
import { photoUrl } from './online';
import { drawBlessing } from './blessings';
import { BalloonRound, FAIR_STOPS, fairCamera, nearbyStop, walkFair } from './fair-state';
import { FairWorld } from './render/fair-world';
export class Fair {
    private root = document.createElement('section');
    private canvas = document.createElement('canvas');
    private world: FairWorld;
    private contextLost = false;
    private contextStatus = document.createElement("p");
    private lastDraw = 0;
    private keys = new Set<string>();
    private x = 180;
    private target: number | null = null;
    private camera = 0;
    private scale = 1;
    private width = 0;
    private height = 0;
    private last = 0;
    private time = 0;
    private step = 0;
    private raf = 0;
    private closed = false;
    private riding = false;
    private near = -2;
    private dialog: HTMLDialogElement;
    private interact: HTMLButtonElement;
    private reduced = matchMedia('(prefers-reduced-motion: reduce)');
    constructor(private item: Krathong, photo: string | undefined, private onExit: () => void) {
        this.root.className = 'fair-room';
        this.root.setAttribute('aria-label', 'โซนงานวัด');
        this.root.innerHTML = `<div class="fair-top"><button id="leave-fair" type="button">← กลับท่าน้ำ</button><div><span>TEMPLE FAIR · คืนแห่งความสุข</span><h1>เดินเล่นงานวัด</h1></div><span class="fair-badge">3D WORLD</span></div><div class="fair-bottom"><div class="fair-directions"><button type="button" data-walk="-1" aria-label="เดินซ้าย">←</button><button type="button" data-walk="1" aria-label="เดินขวา">→</button></div><button type="button" id="fair-interact" hidden>แวะร้าน</button><p>เดินด้วย ← → หรือ A D · แตะทางเพื่อเดิน · E แวะร้าน</p></div><div class="fair-map" aria-label="แผนที่งานวัด"></div><dialog class="fair-dialog"><button type="button" class="fair-close" aria-label="ปิดหน้าร้าน">×</button><h2></h2><p class="fair-detail"></p><div class="fair-activity"></div><p class="fair-result" role="status"></p></dialog>`;
        this.canvas.setAttribute('aria-label', 'ทางเดินงานวัดสามมิติ แตะทางเพื่อเดินไปยังร้าน');
        this.root.prepend(this.canvas);
        this.contextStatus.className = 'fair-context-status';
        this.contextStatus.setAttribute('role', 'status');
        this.contextStatus.hidden = true;
        this.root.append(this.contextStatus);
        this.world = new FairWorld(this.canvas, item.name, photo || photoUrl(item) || defaultAvatar(item.name), lost => {
            this.contextLost = lost; this.clear();
            this.contextStatus.hidden = !lost;
            this.contextStatus.textContent = lost ? 'ภาพ 3D หยุดชั่วคราว กำลังรอการเชื่อมต่อกราฟิกกลับมา…' : '';
        });
        this.dialog = this.root.querySelector('dialog')!;
        this.interact = this.root.querySelector('#fair-interact')!;
        const map = this.root.querySelector('.fair-map')!;
        FAIR_STOPS.forEach((stop, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = stop.name; b.onclick = () => { if (this.riding)
            return; this.target = stop.x; }; b.dataset.stop = String(i); map.append(b); });
        this.root.querySelector('#leave-fair')!.addEventListener('click', () => this.close());
        this.root.querySelector('.fair-close')!.addEventListener('click', () => this.dialog.close());
        this.dialog.addEventListener('close', () => { this.keys.clear(); this.interact.focus(); });
        this.interact.onclick = () => { if (this.riding) {
            this.riding = false;
            this.x = 2200;
            this.near = -2;
        }
        else
            this.visit(); };
        for (const button of Array.from(this.root.querySelectorAll<HTMLButtonElement>('[data-walk]'))) {
            button.onpointerdown = e => { e.preventDefault(); if (this.riding || this.dialog.open)
                return; button.setPointerCapture(e.pointerId); this.target = null; this.keys.add(button.dataset.walk === '-1' ? 'ArrowLeft' : 'ArrowRight'); };
            const up = () => this.keys.delete(button.dataset.walk === '-1' ? 'ArrowLeft' : 'ArrowRight');
            button.onpointerup = up;
            button.onpointercancel = up;
            button.onlostpointercapture = up;
        }
        this.canvas.onpointerdown = e => { if (this.riding || this.dialog.open)
            return; this.target = this.world.targetAt(e.clientX, e.clientY); };
        document.body.append(this.root);
        document.body.classList.add('fair-open');
        this.resize();
        window.addEventListener('resize', this.resize);
        window.addEventListener('keydown', this.keyDown);
        window.addEventListener('keyup', this.keyUp);
        window.addEventListener('blur', this.clear);
        document.addEventListener('visibilitychange', this.visibility);
        this.root.querySelector<HTMLButtonElement>('#leave-fair')!.focus();
        this.raf = requestAnimationFrame(this.frame);
    }
    private keyDown = (e: KeyboardEvent) => {
        if (this.dialog.open)
            return;
        if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D', 'e', 'E', 'Escape'].includes(e.key))
            e.preventDefault();
        if (e.key === 'Escape') {
            this.close();
            return;
        }
        if ((e.key === 'e' || e.key === 'E') && !e.repeat) {
            this.interact.click();
            return;
        }
        if (!this.riding) {
            this.keys.add(e.key.toLowerCase());
            this.target = null;
        }
    };
    private keyUp = (e: KeyboardEvent) => { this.keys.delete(e.key.toLowerCase()); };
    private clear = () => { this.keys.clear(); this.target = null; this.last = 0; };
    private visibility = () => { this.clear(); if (document.hidden)
        cancelAnimationFrame(this.raf);
    else if (!this.closed)
        this.raf = requestAnimationFrame(this.frame); };
    private resize = () => {
        this.width = innerWidth;
        this.height = innerHeight;
        this.world.resize(this.width, this.height);
        this.scale = this.height / (this.width < 700 ? 2100 : 1580);
    };
    private frame = (now: number) => {
        if (this.closed)
            return;
        const dt = this.last ? Math.min((now - this.last) / 1000, .2) : 0;
        this.last = now;
        if (!this.contextLost) this.time += dt;
        let direction = 0;
        if (!this.riding && !this.dialog.open && !this.contextLost) {
            direction = Number(this.keys.has('arrowright') || this.keys.has('d') || this.keys.has('ArrowRight')) - Number(this.keys.has('arrowleft') || this.keys.has('a') || this.keys.has('ArrowLeft'));
            if (!direction && this.target !== null) {
                const distance = this.target - this.x;
                if (Math.abs(distance) < 5)
                    this.target = null;
                else
                    direction = Math.sign(distance);
            }
            // Integrate elapsed time in bounded steps even on slower software GPUs.
            for (let remaining = dt; remaining > 0; remaining -= .05) {
                const next = walkFair(this.x, direction, Math.min(.05, remaining));
                if (this.target !== null && (this.target - this.x) * (this.target - next) <= 0) {
                    this.x = this.target; this.target = null; break;
                }
                this.x = next;
            }
            if (direction)
                this.step += dt * 10;
        }
        const camTarget = fairCamera(this.x, this.width / this.scale);
        this.camera += (camTarget - this.camera) * Math.min(1, dt * 7);
        const near = nearbyStop(this.x);
        if (near !== this.near) {
            this.near = near;
            this.interact.hidden = near < 0;
            this.interact.textContent = near < 0 ? 'แวะร้าน' : `แวะ${FAIR_STOPS[near].name} · E`;
            this.root.querySelectorAll('[data-stop]').forEach((b, i) => b.setAttribute('aria-current', String(i === near)));
        }
        if (this.riding) {
            this.interact.hidden = false;
            this.interact.textContent = 'ลงจากชิงช้าสวรรค์';
        }
        this.root.dataset.playerX = this.x.toFixed(1);
        this.root.dataset.cameraX = this.camera.toFixed(1);
        this.root.dataset.riding = String(this.riding);
        if (now - this.lastDraw >= 33) {
            const renderDt = this.lastDraw ? Math.min((now - this.lastDraw) / 1000, .2) : 1;
            this.lastDraw = now;
            this.world.update(this.x, this.time, this.step, direction !== 0, this.riding, this.reduced.matches, renderDt);
        }
        this.raf = requestAnimationFrame(this.frame);
    };
    private visit() {
        const stop = FAIR_STOPS[this.near];
        if (!stop)
            return;
        this.clear();
        this.root.querySelector('.fair-dialog h2')!.textContent = stop.name;
        this.root.querySelector('.fair-detail')!.textContent = stop.detail;
        const area = this.root.querySelector<HTMLElement>('.fair-activity')!, result = this.root.querySelector<HTMLElement>('.fair-result')!;
        area.replaceChildren();
        result.textContent = '';
        if (stop.kind === 'balloons') {
            let round = new BalloonRound();
            const render = () => { area.replaceChildren(); const grid = document.createElement('div'); grid.className = 'fair-balloons'; for (let i = 0; i < 12; i++) {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = round.hits.has(i) ? 'popped' : '';
                b.textContent = round.hits.has(i) ? '✦' : '●';
                b.style.color = ['#e6a5b7', '#e8ba5b', '#86c3b0', '#b39bcb'][i % 4];
                b.setAttribute('aria-label', `ปาลูกโป่ง ${i + 1}`);
                b.disabled = round.hits.has(i) || round.throws >= 5;
                b.onclick = () => { if (round.throwAt(i)) {
                    render();
                    result.textContent = `แตกแล้ว ${round.hits.size} ลูก · เหลือลูกดอก ${5 - round.throws} ครั้ง${round.throws === 5 ? ' · เก่งมาก! เล่นใหม่ได้เลย' : ''}`;
                } };
                grid.append(b);
            } area.append(grid); const reset = document.createElement('button'); reset.type = 'button'; reset.textContent = 'เริ่มรอบใหม่ · 5 ลูกดอก'; reset.onclick = () => { round = new BalloonRound(); render(); result.textContent = 'เล็งแล้วแตะลูกโป่งได้เลย'; }; area.append(reset); };
            render();
        }
        else if (stop.kind === 'wheel') {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = 'ขึ้นกระเช้าชมงานวัด';
            b.onclick = () => { this.riding = true; this.x = 2200; this.dialog.close(); };
            area.append(b);
        }
        else if (stop.kind === 'stars') {
            for (let i = 0; i < 5; i++) {
                const b = document.createElement('button');
                b.type = 'button';
                b.textContent = '✦';
                b.setAttribute('aria-label', `เลือกดาว ${i + 1}`);
                b.onclick = () => { result.textContent = drawBlessing(); area.querySelectorAll('button').forEach(el => el.disabled = true); };
                area.append(b);
            }
        }
        else {
            result.textContent = 'แวะชมบรรยากาศร้าน แล้วเดินเล่นต่อได้เลย';
        }
        this.dialog.showModal();
    }
    close() { if (this.closed)
        return; this.closed = true; cancelAnimationFrame(this.raf); window.removeEventListener('resize', this.resize); window.removeEventListener('keydown', this.keyDown); window.removeEventListener('keyup', this.keyUp); window.removeEventListener('blur', this.clear); document.removeEventListener('visibilitychange', this.visibility); this.world.dispose(); this.root.remove(); document.body.classList.remove('fair-open');  this.onExit(); }
}
