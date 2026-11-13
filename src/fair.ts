import type { Krathong } from './state';
import { defaultAvatar } from './profile';
import { photoUrl } from './online';
import { drawBlessing } from './blessings';
import { BalloonRound, FAIR_STOPS, FAIR_WIDTH, fairCamera, nearbyStop, walkFair } from './fair-state';
import { box, buildFairArt, ellipse, glow, line, text, wheel } from './fair-art';
export class Fair {
    private root = document.createElement('section');
    private canvas = document.createElement('canvas');
    private c: CanvasRenderingContext2D;
    private art = buildFairArt();
    private image = new Image();
    private keys = new Set<string>();
    private x = 180;
    private target: number | null = null;
    private camera = 0;
    private scale = 1;
    private offset = 0;
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
        this.root.innerHTML = `<div class="fair-top"><button id="leave-fair" type="button">← กลับท่าน้ำ</button><div><span>TEMPLE FAIR · คืนแห่งความสุข</span><h1>เดินเล่นงานวัด</h1></div><span class="fair-badge">2D WORLD</span></div><div class="fair-bottom"><div class="fair-directions"><button type="button" data-walk="-1" aria-label="เดินซ้าย">←</button><button type="button" data-walk="1" aria-label="เดินขวา">→</button></div><button type="button" id="fair-interact" hidden>แวะร้าน</button><p>เดินด้วย ← → หรือ A D · แตะทางเพื่อเดิน · E แวะร้าน</p></div><div class="fair-map" aria-label="แผนที่งานวัด"></div><dialog class="fair-dialog"><button type="button" class="fair-close" aria-label="ปิดหน้าร้าน">×</button><h2></h2><p class="fair-detail"></p><div class="fair-activity"></div><p class="fair-result" role="status"></p></dialog>`;
        this.canvas.setAttribute('aria-label', 'ทางเดินงานวัดสองมิติ แตะทางเพื่อเดินไปยังร้าน');
        this.root.prepend(this.canvas);
        this.c = this.canvas.getContext('2d')!;
        this.dialog = this.root.querySelector('dialog')!;
        this.interact = this.root.querySelector('#fair-interact')!;
        this.image.onerror = () => { this.image.onerror = null; this.image.src = defaultAvatar(item.name); };
        this.image.src = photo || photoUrl(item) || defaultAvatar(item.name);
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
            return; this.target = Math.max(100, Math.min(FAIR_WIDTH - 100, e.offsetX / this.scale + this.camera)); };
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
        const dpr = Math.min(devicePixelRatio, 1.5);
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.scale = Math.min(this.height / 800, this.width / 640);
        this.offset = this.height - 800 * this.scale - (this.width < 700 ? 105 : 0);
    };
    private frame = (now: number) => {
        if (this.closed)
            return;
        const dt = this.last ? Math.min((now - this.last) / 1000, .05) : 0;
        this.last = now;
        this.time += dt;
        let direction = 0;
        if (!this.riding && !this.dialog.open) {
            direction = Number(this.keys.has('arrowright') || this.keys.has('d') || this.keys.has('ArrowRight')) - Number(this.keys.has('arrowleft') || this.keys.has('a') || this.keys.has('ArrowLeft'));
            if (!direction && this.target !== null) {
                const distance = this.target - this.x;
                if (Math.abs(distance) < 5)
                    this.target = null;
                else
                    direction = Math.sign(distance);
            }
            this.x = walkFair(this.x, direction, dt);
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
        this.draw(direction !== 0);
        this.raf = requestAnimationFrame(this.frame);
    };
    private draw(moving: boolean) {
        const c = this.c, dpr = Math.min(devicePixelRatio, 1.5);
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        const sky = c.createLinearGradient(0, 0, 0, this.height);
        sky.addColorStop(0, '#182b43');
        sky.addColorStop(.65, '#486064');
        sky.addColorStop(1, '#6e7170');
        c.fillStyle = sky;
        c.fillRect(0, 0, this.width, this.height);
        c.save();
        c.translate(0, this.offset);
        c.scale(this.scale, this.scale);
        const visible = this.width / this.scale, t = this.reduced.matches ? 0 : this.time;
        for (let i = 0; i < 55; i++) {
            const sx = ((i * 173.3 - this.camera * .12) % (visible + 80) + visible + 80) % (visible + 80);
            ellipse(c, sx, 50 + (i * 37) % 305, 1.2, 1.2, '#fae7be90');
        }
        const moonX = visible * .77 - this.camera * .025;
        glow(c, moonX, 153, 106, '250,219,155', .17);
        ellipse(c, moonX, 153, 35, 35, '#ffe6b6');
        // Distant wooded hills and a temple silhouette scroll more slowly than shops.
        for (let i = -1; i < 12; i++) {
            const hx = i * 410 - this.camera * .25;
            ellipse(c, hx, 558, 310, 185, '#263e4b');
            ellipse(c, hx + 110, 585, 190, 180, '#28494b');
        }
        const tx = 380 - this.camera * .38;
        box(c, tx, 410, 180, 169, '#32474b');
        for (let i = 0; i < 3; i++) {
            c.fillStyle = ['#6e615c', '#8d7464', '#a28c70'][i];
            c.beginPath();
            c.moveTo(tx - 35 + i * 12, 426 - i * 19);
            c.quadraticCurveTo(tx + 85, 404 - i * 27, tx + 90, 338 - i * 13);
            c.quadraticCurveTo(tx + 100, 404 - i * 27, tx + 215 - i * 12, 426 - i * 19);
            c.fill();
        }
        for (let i = 0; i < 4; i++)
            box(c, tx + 20 + i * 39, 451, 16, 52, '#d8ba8044', 7);
        for (let i = 0; i < 10; i++) {
            const lx = ((i * 419 - this.camera * .3 + 3800) % 3800), ly = 360 - ((t * 9 + i * 47) % 310);
            glow(c, lx, ly, 30, '255,197,114', .13);
            box(c, lx - 6, ly - 10, 12, 19, '#e9c48b', 4);
        }
        c.translate(-this.camera, 0);
        c.drawImage(this.art, 0, 0);
        box(c, 0, 800, FAIR_WIDTH, Math.max(0, (this.height - this.offset) / this.scale - 800), '#5b555b');
        // Festoon cables and breathing bulbs.
        for (let x = 0; x < FAIR_WIDTH; x += 260) {
            c.strokeStyle = '#c1a28a';
            c.lineWidth = 2;
            c.beginPath();
            c.moveTo(x, 243);
            c.quadraticCurveTo(x + 130, 308, x + 260, 243);
            c.stroke();
            for (let j = 0; j < 6; j++) {
                const bx = x + j * 43, by = 243 + Math.sin(j / 6 * Math.PI) * 30;
                line(c, [bx, by, bx, by + 12], '#bca18c', 1);
                glow(c, bx, by + 18, 33, '255,203,125', .16 + Math.sin(t * 1.3 + x + j) * .035);
                ellipse(c, bx, by + 18, 4, 6, j % 3 ? '#ffe2a2' : '#edb1b0');
            }
        }
        wheel(c, t, this.riding, (x, y) => this.avatar(x, y, false, .65));
        // A few ambient festival visitors; these are scenery, not live players.
        for (const [i, x] of [790, 1310, 1770, 2635, 3100, 3620].entries()) {
            const nx = x + Math.sin(t * .25 + i) * 30;
            this.visitor(nx, 650, ['#a2b6bb', '#d8b29d', '#bfa7c7'][i % 3], t + i);
        }
        if (!this.riding)
            this.avatar(this.x, 690, moving, 1);
        if (this.target !== null && !this.riding) {
            ellipse(c, this.target, 695, 17, 5, '#ffe3ab66');
            text(c, '⌄', this.target, 682, 22);
        }
        // Foreground gives the street a distinct side-view stage.
        for (let x = 45; x < FAIR_WIDTH; x += 510) {
            ellipse(c, x, 795, 67, 25, '#2d4448');
            for (let j = 0; j < 5; j++)
                ellipse(c, x + (j - 2) * 21, 785 - j % 2 * 9, 23, 29, '#3e5a53');
        }
        c.restore();
    }
    private visitor(x: number, y: number, color: string, t: number) {
        const c = this.c;
        ellipse(c, x, y + 1, 20, 5, '#23344055');
        line(c, [x - 6, y - 21, x - 9, y - 1], '#3a3c52', 8);
        line(c, [x + 6, y - 21, x + 9, y - 1], '#3a3c52', 8);
        box(c, x - 16, y - 52, 32, 35, color, 12);
        ellipse(c, x, y - 65 + Math.sin(t) * 1, 17, 19, '#dfbda4');
        ellipse(c, x, y - 77, 17, 9, '#514352');
        ellipse(c, x - 5, y - 64, 1.5, 2, '#423e4b');
        ellipse(c, x + 5, y - 64, 1.5, 2, '#423e4b');
    }
    private avatar(x: number, y: number, moving: boolean, scale: number) {
        const c = this.c;
        c.save();
        c.translate(x, y);
        c.scale(scale, scale);
        const stride = moving && !this.reduced.matches ? Math.sin(this.step) * 10 : 0, bob = moving && !this.reduced.matches ? Math.abs(Math.sin(this.step)) * 3 : 0;
        ellipse(c, 0, 2, 28, 7, '#25313c55');
        line(c, [-9, -25, -10 + stride, 0], '#3d4057', 12);
        line(c, [9, -25, 10 - stride, 0], '#3d4057', 12);
        box(c, -20 + stride, -5, 21, 9, '#f0d9bd', 4);
        box(c, 0 - stride, -5, 21, 9, '#f0d9bd', 4);
        c.translate(0, -bob);
        const hue = (this.item.name.split('').reduce((n, s) => n + s.charCodeAt(0), 0) * 29) % 360;
        box(c, -24, -65, 48, 47, `hsl(${hue} 35% 67%)`, 17);
        line(c, [-22, -53, -31 - stride * .4, -28], '#eac5a8', 9);
        line(c, [22, -53, 31 + stride * .4, -28], '#eac5a8', 9);
        box(c, -20, -29, 40, 6, '#ffffff20', 3);
        ellipse(c, 0, -89, 32, 32, '#f8e7c8');
        c.save();
        c.beginPath();
        c.arc(0, -89, 28, 0, Math.PI * 2);
        c.clip();
        if (this.image.complete && this.image.naturalWidth)
            c.drawImage(this.image, -28, -117, 56, 56);
        c.restore();
        c.font = '600 16px sans-serif';
        const width = Math.min(260, c.measureText(this.item.name).width + 24);
        box(c, -width / 2, -157, width, 27, '#233947df', 13);
        text(c, this.item.name, 0, -138, 16);
        c.restore();
    }
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
        return; this.closed = true; cancelAnimationFrame(this.raf); window.removeEventListener('resize', this.resize); window.removeEventListener('keydown', this.keyDown); window.removeEventListener('keyup', this.keyUp); window.removeEventListener('blur', this.clear); document.removeEventListener('visibilitychange', this.visibility); this.image.onload = null; this.image.onerror = null; this.root.remove(); document.body.classList.remove('fair-open'); this.art.width = 0; this.art.height = 0; this.onExit(); }
}
