// 生成扩展图标（16 / 48 / 128 PNG）：蓝色圆角方块 + 白色 U
// 运行：node extensions/BrowserExt/icons/generate-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = dirname(fileURLToPath(import.meta.url));

const insideRounded = (x, y, size, radius) => {
    if (x < radius && y < radius) return (radius - x) ** 2 + (radius - y) ** 2 <= radius ** 2;
    if (x >= size - radius && y < radius) return (x - (size - radius - 1)) ** 2 + (radius - y) ** 2 <= radius ** 2;
    if (x < radius && y >= size - radius) return (radius - x) ** 2 + (y - (size - radius - 1)) ** 2 <= radius ** 2;
    if (x >= size - radius && y >= size - radius)
        return (x - (size - radius - 1)) ** 2 + (y - (size - radius - 1)) ** 2 <= radius ** 2;
    return true;
};

const draw = (size) => {
    const radius = Math.max(2, Math.round(size / 6));
    const bg = [0, 122, 204, 255];
    const fg = [255, 255, 255, 255];
    const pixels = Array.from({ length: size }, () => Array.from({ length: size }, () => [0, 0, 0, 0]));
    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            if (insideRounded(x, y, size, radius)) pixels[y][x] = bg;
        }
    }
    const left = Math.round(size * 0.3);
    const right = Math.round(size * 0.7);
    const top = Math.round(size * 0.24);
    const bottom = Math.round(size * 0.76);
    const thickness = Math.max(1, Math.round(size / 12));
    for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < left + thickness; x += 1) pixels[y][x] = fg;
        for (let x = right - thickness; x < right; x += 1) pixels[y][x] = fg;
    }
    for (let y = bottom - thickness; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) pixels[y][x] = fg;
    }
    return pixels;
};

const chunk = (tag, data) => {
    const tagBuffer = Buffer.from(tag, "ascii");
    const body = Buffer.concat([tagBuffer, data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0, 0);
    return Buffer.concat([length, body, crc]);
};

const crcTable = (() => {
    const table = new Array(256);
    for (let n = 0; n < 256; n += 1) {
        let c = n;
        for (let k = 0; k < 8; k += 1) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[n] = c >>> 0;
    }
    return table;
})();

const crc32 = (buffer) => {
    let crc = 0xffffffff;
    for (const byte of buffer) {
        crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return crc ^ 0xffffffff;
};

const writePng = (path, pixels) => {
    const size = pixels.length;
    const raw = Buffer.concat(
        pixels.map((row) => Buffer.concat([Buffer.from([0]), Buffer.from(row.flat())])),
    );
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);
    ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // RGBA
    const png = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", ihdr),
        chunk("IDAT", deflateSync(raw, { level: 9 })),
        chunk("IEND", Buffer.alloc(0)),
    ]);
    writeFileSync(path, png);
};

for (const size of [16, 48, 128]) {
    writePng(join(OUT_DIR, `icon${size}.png`), draw(size));
}
console.log("icons generated");
