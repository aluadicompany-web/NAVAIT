import { FAIR_STOPS, FAIR_WIDTH } from './fair-state';
export const GROUND = 650;
type C = CanvasRenderingContext2D;
export function box(c: C, x: number, y: number, w: number, h: number, color: string | CanvasGradient, r = 0) { c.fillStyle = color; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); }
export function ellipse(c: C, x: number, y: number, rx: number, ry: number, color: string) { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }
export function line(c: C, points: number[], color: string, width = 2) { c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(points[0], points[1]); for (let i = 2; i < points.length; i += 2)
    c.lineTo(points[i], points[i + 1]); c.stroke(); }
export function text(c: C, s: string, x: number, y: number, size = 20, color = '#fff1d4') { c.fillStyle = color; c.font = `600 ${size}px sans-serif`; c.textAlign = 'center'; c.fillText(s, x, y); }
export function glow(c: C, x: number, y: number, r: number, color = '255,200,114', a = .22) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(1, `rgba(${color},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
function roof(c: C, x: number, y: number, w: number, color: string) {
    box(c, x, y, w, 27, '#513c4d', 6);
    for (let i = 0; i < 10; i++) {
        c.fillStyle = i % 2 ? '#f6dfb1' : color;
        c.beginPath();
        c.moveTo(x + 12 + i * (w - 24) / 10, y - 60);
        c.lineTo(x + 12 + (i + 1) * (w - 24) / 10, y - 60);
        c.lineTo(x + (i + 1) * w / 10, y + 12);
        c.lineTo(x + i * w / 10, y + 12);
        c.closePath();
        c.fill();
        box(c, x + i * w / 10, y + 6, w / 10, 22, c.fillStyle as string, 8);
    }
}
function stall(c: C, x: number, name: string, color: string, kind: string) {
    ellipse(c, x, GROUND + 5, 224, 24, '#182b34');
    box(c, x - 196, 370, 392, 270, '#4b3545', 8);
    box(c, x - 181, 386, 362, 185, '#322e40');
    box(c, x - 207, 365, 15, 284, '#bf9369', 5);
    box(c, x + 192, 365, 15, 284, '#bf9369', 5);
    if (kind === 'balloons') {
        box(c, x - 160, 410, 320, 135, '#725167', 8);
        for (let i = 0; i < 12; i++) {
            const bx = x - 122 + (i % 6) * 49, by = 444 + Math.floor(i / 6) * 59;
            ellipse(c, bx, by, 16, 21, ['#e7a2b3', '#efc56f', '#86c7b5', '#b6a5dd'][i % 4]);
            ellipse(c, bx - 5, by - 7, 4, 6, '#fff4d480');
            line(c, [bx, by + 21, bx + 2, by + 33], '#dab7a4', 1);
        }
    }
    else if (kind === 'stars') {
        for (let i = 0; i < 9; i++) {
            const sx = x - 130 + i % 5 * 64, sy = 435 + Math.floor(i / 5) * 72;
            line(c, [sx, 390, sx, sy], '#e0b779', 1);
            text(c, '✦', sx, sy + 14, 38, '#ffda8a');
        }
    }
    else {
        for (let i = 0; i < 7; i++) {
            const sx = x - 145 + i * 48;
            box(c, sx - 17, 513, 35, 30, '#d4a274', 5);
            for (let j = 0; j < 3; j++)
                ellipse(c, sx - 9 + j * 9, 509, 6, 7, kind === 'drink' ? ['#eeb3c4', '#bdabd4', '#b9dbc8'][i % 3] : ['#f2cf75', '#dfa37b', '#cbe3a2'][i % 3]);
        }
        if (kind === 'drink')
            for (let i = 0; i < 3; i++) {
                line(c, [x - 90 + i * 90, 490, x - 90 + i * 90, 442], '#bb9478', 3);
                ellipse(c, x - 90 + i * 90, 441, 24, 32, ['#edb7cf', '#c2c4e6', '#ffe2a9'][i]);
            }
        else {
            ellipse(c, x + 80, 496, 54, 11, '#bd9778');
            ellipse(c, x + 80, 491, 49, 9, '#373641');
            for (let i = 0; i < 6; i++)
                ellipse(c, x + 44 + i * 13, 486, 6, 5, '#deb38a');
        }
    }
    // Friendly stall keeper, drawn behind the counter.
    box(c, x - 29, 495, 58, 78, color, 18);
    ellipse(c, x, 479, 25, 28, '#ebc3a4');
    box(c, x - 26, 450, 52, 17, '#453b4b', 9);
    ellipse(c, x - 8, 480, 2, 3, '#443643');
    ellipse(c, x + 8, 480, 2, 3, '#443643');
    box(c, x - 197, 556, 394, 82, color, 5);
    box(c, x - 209, 548, 418, 15, '#e7c99c', 5);
    for (let i = 0; i < 8; i++)
        line(c, [x - 173 + i * 50, 572, x - 173 + i * 50, 630], '#ffffff12', 2);
    roof(c, x - 224, 371, 448, color);
    box(c, x - 136, 334, 272, 48, '#f5e4bd', 10);
    text(c, name, x, 365, 23, '#594047');
    for (let i = 0; i < 7; i++) {
        const lx = x - 180 + i * 60;
        line(c, [lx, 395, lx, 409], '#a48363');
        ellipse(c, lx, 416, 7, 9, '#ffe6a7');
        glow(c, lx, 416, 29);
    }
}
export function buildFairArt() {
    const canvas = document.createElement('canvas');
    canvas.width = FAIR_WIDTH;
    canvas.height = 800;
    const c = canvas.getContext('2d')!;
    // A low garden wall and warm stone promenade, continuous across the whole fair.
    box(c, 0, 574, FAIR_WIDTH, 84, '#354947');
    box(c, 0, 575, FAIR_WIDTH, 8, '#8a9a78');
    for (let x = 0; x < FAIR_WIDTH; x += 70) {
        box(c, x, 596, 60, 38, '#405750', 5);
    }
    const ground = c.createLinearGradient(0, 650, 0, 800);
    ground.addColorStop(0, '#ac967e');
    ground.addColorStop(1, '#5b555b');
    box(c, 0, 650, FAIR_WIDTH, 150, ground);
    box(c, 0, 650, FAIR_WIDTH, 9, '#e3c7a2');
    for (let row = 0; row < 4; row++)
        for (let x = -100; x < FAIR_WIDTH; x += 120) {
            line(c, [x + (row % 2) * 60, 677 + row * 36, x + 112 + (row % 2) * 60, 677 + row * 36], '#e7cdaa25', 2);
            line(c, [x + (row % 2) * 60, 679 + row * 36, x - 12 + (row % 2) * 60, 706 + row * 36], '#342f3d22', 2);
        }
    for (const stop of FAIR_STOPS)
        if (stop.kind !== 'wheel')
            stall(c, stop.x, stop.name, stop.color, stop.x === 3390 ? 'drink' : stop.kind);
    // Entrance arch.
    for (const x of [105, 240]) {
        box(c, x, 401, 16, 249, '#b78869', 5);
        box(c, x - 7, 426, 30, 6, '#efce8e');
    }
    box(c, 83, 389, 180, 54, '#edd6a7', 9);
    text(c, 'ยินดีต้อนรับ', 173, 422, 19, '#65424c');
    for (const x of [90, 253]) {
        ellipse(c, x, 474, 18, 24, '#e7a482');
        box(c, x - 12, 451, 24, 4, '#f9d49a');
        line(c, [x, 498, x, 515], '#d8b17c');
    }
    // Decorative benches and planters between stalls.
    for (const x of [730, 1810, 3140]) {
        box(c, x - 42, 604, 84, 13, '#b88970', 4);
        box(c, x - 39, 570, 78, 26, '#bb9478', 4);
        box(c, x - 33, 617, 9, 30, '#45434b');
        box(c, x + 24, 617, 9, 30, '#45434b');
    }
    for (const x of [210, 720, 1275, 1820, 2590, 3130, 3670]) {
        box(c, x - 19, 611, 38, 38, '#ab796b', 5);
        for (let i = 0; i < 5; i++) {
            ellipse(c, x + (i - 2) * 8, 607 - Math.sin(i) * 13, 10, 15, '#527c68');
            ellipse(c, x + (i - 2) * 8, 590 - Math.sin(i) * 13, 5, 6, i % 2 ? '#efb5bb' : '#edcf8c');
        }
    }
    return canvas;
}
export function wheel(c: C, time: number, riding: boolean, avatar: (x: number, y: number) => void) {
    const x = 2200, y = 352, r = 204, angle = time * .12;
    glow(c, x, y, 300, '245,186,111', .08);
    line(c, [x - 112, 642, x, 352, x + 112, 642], '#d9bb95', 16);
    line(c, [x - 108, 642, x, 361, x + 108, 642], '#796575', 5);
    c.strokeStyle = '#e7cba2';
    c.lineWidth = 9;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = '#ae8e91';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(x, y, r - 17, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 10; i++) {
        const a = angle + i * Math.PI / 5, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        line(c, [x, y, px, py], '#ae9290', 4);
        line(c, [px, py, px, py + 22], '#ebcfac', 3);
        box(c, px - 23, py + 22, 46, 35, ['#dc9d9d', '#90b5b1', '#b5a4cb', '#e6c17e'][i % 4], 9);
        box(c, px - 18, py + 25, 36, 13, '#344650', 4);
        box(c, px - 25, py + 18, 50, 7, '#ffe2ad', 3);
        if (riding && i === 3)
            avatar(px, py + 51);
    }
    for (let i = 0; i < 40; i++) {
        const a = i * Math.PI / 20;
        ellipse(c, x + Math.cos(a) * r, y + Math.sin(a) * r, 3, 3, '#ffeab5');
    }
    ellipse(c, x, y, 20, 20, '#f4d698');
    text(c, '✦', x, y + 9, 28, '#a47970');
    box(c, x - 119, 624, 238, 29, '#775869', 5);
    text(c, 'ชิงช้าสวรรค์', x, 646, 20);
}
