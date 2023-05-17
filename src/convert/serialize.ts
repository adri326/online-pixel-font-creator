import { FontData, Glyph } from "../utils/FontData.js";
import { base64ToBytes, bytesToBase64 } from "./base64.js";

export function serializeFont(fontData: FontData): string {
    let res = fontData.name.replace(/\n/g, "\\n") + "\n";
    res += fontData.author.replace(/\n/g, "\\n") + "\n";
    res += fontData.style.replace(/\n/g, "\\n") + "\n";
    res += `${fontData.width}:${fontData.height}`;
    res += `:${fontData.baseline}:${fontData.ascend}:${fontData.descend}:${fontData.spacing}:${fontData.emSize}:${fontData.leftOffset}`;

    for (let [id, glyph] of fontData.glyphs) {
        let buffer = new Uint8Array(Math.ceil(glyph.width * glyph.height / 8 / Uint8Array.BYTES_PER_ELEMENT));
        let pixels = glyph.getPixels();
        let current_index = 0;
        let has_pixel = false;
        for (let n = 0; n < pixels.length; n += Uint8Array.BYTES_PER_ELEMENT * 8) {
            let sum = 0;
            for (let o = 0; o < Uint8Array.BYTES_PER_ELEMENT * 8 && n + o < pixels.length; o++) {
                if (pixels[n + o]) {
                    has_pixel = true;
                    sum |= 1 << (7 - o);
                }
            }
            buffer[current_index++] = sum;
        }
        if (!has_pixel) continue;

        res += `\n${id}:`;
        res += bytesToBase64(buffer);
        if (glyph.width !== fontData.width || glyph.height !== fontData.height || glyph.baseline !== fontData.baseline || glyph.leftOffset !== fontData.leftOffset) {
            res += `:${glyph.width}:${glyph.height}:${glyph.baseline || fontData.baseline}:${glyph.leftOffset || fontData.leftOffset}`;
        }
    }

    return res;
}

export function deserializeFont(raw: string): FontData {
    let lines = raw.split("\n");
    let iter: Iterator<string, string> & IterableIterator<string> = lines[Symbol.iterator]();

    let name = iter.next().value.replace(/\\n/g, "\n");
    let author = iter.next().value.replace(/\\n/g, "\n");
    let style = iter.next().value.replace(/\\n/g, "\n");

    let spacing = iter.next().value.split(":").map(x => +x);

    let fontData: FontData = {
        width: spacing[0],
        height: spacing[1],
        baseline: spacing[2],
        ascend: spacing[3],
        descend: spacing[4],
        spacing: spacing[5],
        emSize: spacing[6],
        leftOffset: spacing[7] ?? 0,

        glyphs: new Map(),
        // history: [],

        name,
        author,
        style
    };

    for (let raw_glyph of iter) {
        if (!raw_glyph.trim()) continue;
        let split = raw_glyph.split(":");
        let [rawId, b64] = split;
        const id = +rawId;

        let buffer = base64ToBytes(b64);
        let pixels = [];

        let width = split.length >= 5 ? +split[2] : fontData.width;
        let height = split.length >= 5 ? +split[3] : fontData.height;
        let baseline = split.length >= 5 ? +split[4] : fontData.baseline;
        let leftOffset = split.length >= 6 ? +split[5] : fontData.leftOffset;

        const BITS = buffer.BYTES_PER_ELEMENT * 8;

        for (let n = 0; n < width * height; n += BITS) {
            let word = buffer[n / (BITS)];
            for (let o = 0; o < BITS && n + o < width * height; o++) {
                pixels.push(!!(word & (1 << (BITS - 1 - o))));
            }
        }

        let glyph = new Glyph(width, height, baseline, leftOffset, pixels);

        fontData.glyphs.set(id, glyph);
    }

    return fontData;
}


export function downloadFont(fontData: FontData) {
    const url = window.URL.createObjectURL(new Blob([serializeFont(fontData)], {type: "text/plain"}));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fontData.name.replace(/[^a-zA-Z0-9]/g, "")}-${fontData.style.replace(/[^a-zA-Z0-9]/g, "")}.pfs`;
    a.click();
}
