const width = 480;
const height = 320;
export const duration = 10;
const scale = width / 1536;
const round = Math.round;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const tau = 2 * Math.PI;
const glyphs = {
  'С': '011/100/100/100/011', ' ': '0/0/0/0/0', 'Н': '101/101/111/101/101',
  'О': '010/101/101/101/010', 'В': '110/101/110/101/110', 'Ы': '10001/10001/11101/10101/11101',
  'М': '10001/11011/10101/10001/10001', 'Г': '111/100/100/100/100',
  'Д': '0110/0100/0100/1111/1001', '!': '1/1/1/0/1',
};
const bulbs = [
  [146, 204], [211, 212], [224, 268], [157, 304], [100, 311], [67, 304],
  [272, 361], [237, 390], [175, 417], [88, 429], [294, 463], [258, 524],
  [208, 536], [47, 543], [119, 573], [363, 597], [311, 635], [254, 650],
  [200, 665], [93, 679], [73, 700], [24, 683],
].map(bulb => bulb.map(pos => round(pos * scale)));
const bulbHighlights = ['#fff6b5', '#ffe1a2', '#e6f3b7'];

function path(ctx, outline) {
  ctx.beginPath();
  ctx.moveTo(...outline[0]);
  for (const pt of outline.slice(1)) ctx.lineTo(...pt);
  ctx.closePath();
}

function rect(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function text(ctx, label, x, y) {
  const shapes = [...label].map(letter => glyphs[letter].split('/'));
  let cursor = x - Math.floor(shapes.reduce((sum, character) => sum + character[0].length + 1, -1) / 2);
  ctx.fillStyle = '#142345';
  for (const character of shapes) {
    for (let row = 0; row < character.length; row++) {
      for (let col = 0; col < character[row].length; col++) {
        if (character[row][col] === '1') ctx.fillRect(cursor + col, y + row, 1, 1);
      }
    }
    cursor += character[0].length + 1;
  }
}

function drawScreen(ctx, t) {
  const left = 244;
  const top = 103;
  ctx.save();
  path(ctx, [[245, 103], [302, 103], [304, 105], [304, 144], [302, 145], [245, 145], [244, 143], [244, 105]]);
  ctx.clip();
  ctx.translate(left, top);
  const sky = ['#143b7b', '#1d52a0', '#296aba', '#4084c5', '#4e95ce', '#58a1d3'];
  sky.forEach((band, index) => rect(ctx, band, 0, index * 5, 61, 5));
  path(ctx, [[23, 13], [26, 13], [26, 11], [31, 11], [31, 10], [36, 10], [36, 12], [41, 12], [41, 14], [45, 14], [45, 16], [23, 16]]);
  ctx.fillStyle = '#b5d7e8';
  ctx.fill();
  rect(ctx, '#92bcd7', 27, 16, 17, 1);
  path(ctx, [[0, 29], [5, 27], [13, 27], [13, 26], [25, 26], [33, 29], [45, 28], [53, 25], [60, 25], [61, 44], [0, 44]]);
  ctx.fillStyle = '#4b7b40';
  ctx.fill();
  path(ctx, [[0, 36], [7, 33], [14, 32], [25, 32], [31, 30], [44, 30], [51, 32], [60, 34], [61, 43], [0, 43]]);
  ctx.fillStyle = '#2d633e';
  ctx.fill();
  rect(ctx, '#2151a4', 0, 37, 61, 6);
  rect(ctx, '#5287cc', 0, 37, 61, 1);
  rect(ctx, '#437944', 0, 38, 15, 5);
  rect(ctx, '#709951', 1, 38, 13, 1);
  rect(ctx, '#d8e9c5', 3, 40, 2, 1);
  rect(ctx, '#9ec49b', 7, 40, 4, 1);
  rect(ctx, '#619ac8', 50, 38, 11, 5);
  rect(ctx, '#d9e3e6', 53, 40, 5, 1);
  rect(ctx, '#a6d6ef', 4, 4, 6, 5);
  rect(ctx, '#527bb1', 5, 5, 4, 3);
  rect(ctx, '#d1e1d8', 6, 9, 2, 1);
  rect(ctx, '#acc9dd', 4, 11, 6, 1);
  rect(ctx, '#f7d27a', 4, 15, 7, 5);
  rect(ctx, '#c78344', 5, 16, 5, 1);
  rect(ctx, '#e8b05e', 6, 17, 3, 1);

  if (t < 3.2 || t > 7.8) {
    const slide = clamp((t - 1.4) / 1.25, 0, 1);
    const home = clamp((t - 8) / 1, 0, 1);
    const cursor = 1 - (1 - slide) ** 2 - home;
    const px = round(20 - 11 * cursor);
    const py = round(24 - 6 * cursor);
    path(ctx, [[px, py - 1], [px, py + 6], [px + 2, py + 4], [px + 5, py + 4]]);
    ctx.fillStyle = '#f4e9ce';
    ctx.fill();
  }

  drawGreetingWindow(ctx, t);
  ctx.globalAlpha = .105;
  for (let y = 1; y < 42; y += 2) rect(ctx, '#142249', 0, y, 61, 1);
  ctx.globalAlpha = 1;
  rect(ctx, '#6388ae5b', 1, 1, 57, 1);
  rect(ctx, '#121c346f', 0, 1, 1, 40);
  rect(ctx, '#1118328f', 59, 1, 2, 40);
  ctx.restore();
}

export function drawGreetingWindow(ctx, time) {
  if (time < 3.2 || time > 7.8) return;
  const reveal = clamp(Math.min(time - 3.2, 7.8 - time) / .18, 0, 1);
  ctx.save();
  ctx.beginPath();
  ctx.rect(5, 6, 51, round(29 * reveal));
  ctx.clip();
  rect(ctx, '#193146', 7, 7, 49, 27);
  rect(ctx, '#e1e3c8', 6, 6, 48, 26);
  rect(ctx, '#416cb0', 7, 7, 46, 4);
  rect(ctx, '#83a6d6', 7, 7, 46, 1);
  rect(ctx, '#e7bb68', 8, 8, 2, 2);
  rect(ctx, '#a4b8d3', 13, 8, 9, 1);
  rect(ctx, '#b47458', 50, 8, 2, 2);
  rect(ctx, '#fff0cf', 8, 12, 44, 18);
  ctx.restore();
}

const snowColors = ['#cfe3ff', '#b7cdef', '#628ccb', '#e3e8ed'];

export function drawSnow(ctx, t) {
  ctx.save();
  path(ctx, [[99, 32], [160, 32], [160, 129], [110, 129], [106, 113], [99, 102]]);
  ctx.moveTo(173, 32);
  ctx.rect(173, 32, 59, 97);
  ctx.clip();
  for (let index = 0; index < 40; index++) {
    const phase = ((index * 97 % 137) / 137 + t / duration) % 1;
    const x = (index < 19 ? 99 : 173) + (index * 23 % 57) + round(Math.sin(t / duration * tau + index * .84) * (2 + index % 4));
    const y = round(30 + 101 * phase);
    const opacity = clamp(Math.min(phase, 1 - phase) * 15, 0, 1);
    ctx.globalAlpha = opacity * (.55 + index % 3 * .16);
    rect(ctx, snowColors[index % snowColors.length], x, y, 1, index % 9 === 0 ? 2 : 1);
  }
  ctx.restore();
}

export function drawGarland(ctx, phase) {
  ctx.save();
  for (const [index, [x, y]] of bulbs.entries()) {
    const light = (.5 + Math.sin(phase * 3 - index * .56) * .5) ** 2;
    const dim = 1 - light;
    ctx.fillStyle = '#241a10';
    ctx.globalAlpha = .57 * dim;
    ctx.beginPath();
    ctx.rect(x - 4, y - 3, 8, 6);
    ctx.rect(x - 3, y - 4, 6, 8);
    ctx.fill();
    ctx.globalAlpha = .64 * dim;
    rect(ctx, '#241a10', x - 2, y - 2, 5, 5);
    ctx.globalAlpha = .82 * light;
    rect(ctx, bulbHighlights[index % bulbHighlights.length], x - 1, y - 1, 3, 3);
  }
  ctx.restore();
}

const fireArea = { x: 410, y: 149, width: 58, height: 66 };

export function drawFire(ctx, original, pixels, phase) {
  const { x, y, width, height } = fireArea;
  for (let py = 0; py < height; py++) {
    const rise = Math.sin(py * .33 - phase * 7) + .7 * Math.sin(py * .18 - phase * 4);
    for (let px = 0; px < width; px++) {
      const index = (py * width + px) * 4;
      const edge = clamp(Math.min(px, py, width - px - 1, height - py - 1) / 7, 0, 1);
      const arch = clamp(Math.min(py + (px - 28) * 2, py + (width - 30 - px) * 2) / 7 + 1, 0, 1);
      const warp = edge * arch;
      const n = Math.sin(phase * 9 - py * .4 + px * .17);
      const sx = clamp(round(px + rise * 2.4 * warp), 0, width - 1);
      const sy = clamp(round(py + n * 1.7 * warp), 0, height - 1);
      const source = (sy * width + sx) * 4;
      const heat = clamp((Math.max(original.data[index + 1], original.data[source + 1]) - 49) / 92, 0, 1);
      const mix = warp * (.25 + .62 * heat);
      for (let channel = 0; channel < 3; channel++) {
        const old = original.data[index + channel];
        const change = original.data[source + channel] - old;
        pixels.data[index + channel] = old + mix * change + warp * n * heat * (channel === 1 ? 16 : 8);
      }
      pixels.data[index + 3] = 255;
    }
  }
  ctx.putImageData(pixels, x, y);
  ctx.save();
  for (let index = 0; index < 13; index++) {
    const lift = ((index * .317 + phase / tau * (2 + index % 2)) % 1);
    const sx = 418 + index * 7 % 35 + round(Math.sin(lift * 5 + index) * 2);
    const sy = 199 - round(lift * 46);
    ctx.globalAlpha = .66 * Math.sin(lift * Math.PI);
    rect(ctx, index % 3 ? '#febb56' : '#f97c2c', sx, sy, 1, 1 + index % 2);
  }
  ctx.restore();
}

function drawGreeting(ctx) {
  text(ctx, 'С НОВЫМ', 219, 94);
  text(ctx, 'ГОДОМ!', 219, 100);
}

export function renderFrame(time, scene) {
  const phase = time / duration * tau;
  const greeting = time >= 3.38 && time <= 7.62;
  const { ctx, room, fire, firePixels } = scene;
  ctx.drawImage(room, 0, 0);
  drawSnow(ctx, time);
  drawGarland(ctx, phase);
  drawFire(ctx, fire, firePixels, phase);
  drawScreen(ctx, time);

  const { pixelCtx, view, pixels, outputCtx } = scene;
  pixelCtx.drawImage(view, 0, 0, pixels.width, pixels.height);
  if (greeting) drawGreeting(pixelCtx);
  outputCtx.drawImage(pixels, 0, 0, 768, 512);
  return greeting;
}

export async function loadNewYearScene(canvas) {
  const room = new Image();
  room.src = new URL('./assets/new-year-room.png', import.meta.url);
  await room.decode();

  const view = document.createElement('canvas');
  view.width = width;
  view.height = height;
  const ctx = view.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(room, 0, 0);
  const fire = ctx.getImageData(fireArea.x, fireArea.y, fireArea.width, fireArea.height);
  const firePixels = ctx.createImageData(fireArea.width, fireArea.height);
  const pixels = document.createElement('canvas');
  pixels.width = 384;
  pixels.height = 256;
  const pixelCtx = pixels.getContext('2d');
  const outputCtx = canvas.getContext('2d');
  outputCtx.imageSmoothingEnabled = false;
  return { room, view, ctx, fire, firePixels, pixels, pixelCtx, outputCtx };
}
