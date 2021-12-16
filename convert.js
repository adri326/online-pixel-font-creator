import {bytesToBase64, base64ToBytes} from "./base64.js";

// Data is stored as base64, with characters encoded as big endian 8-bit numbers

export function serialize_font(font_data) {
    let res = `${font_data.width}:${font_data.height}`;
    res += `:${font_data.baseline}:${font_data.ascend}:${font_data.descend}:${font_data.spacing}`;

    for (let [id, glyph] of font_data.glyphs) {
        res += `\n${id}:`;
        let buffer = new Uint8Array(Math.ceil(font_data.width * font_data.height / 8 / Uint8Array.BYTES_PER_ELEMENT));
        let pixels = glyph.flat();
        let current_index = 0;
        for (let n = 0; n < pixels.length; n += Uint8Array.BYTES_PER_ELEMENT * 8) {
            let sum = 0;
            for (let o = 0; o < Uint8Array.BYTES_PER_ELEMENT * 8 && n + o < pixels.length; o++) {
                if (pixels[n + o]) sum |= 1 << (7 - o);
            }
            buffer[current_index++] = sum;
        }
        res += bytesToBase64(buffer);
    }

    return res;
}

export function deserialize_font(raw) {
    let lines = raw.split("\n");
    let iter = lines[Symbol.iterator]();

    let first_line = iter.next().value.split(":").map(x => +x);

    let font_data = {
        width: first_line[0],
        height: first_line[1],
        baseline: first_line[2],
        ascend: first_line[3],
        descend: first_line[4],
        spacing: first_line[5],

        glyphs: new Map(),
        history: [],
    };

    for (let raw_glyph of iter) {
        let [id, b64] = raw_glyph.split(":");
        id = +id;

        let glyph = [];
        let buffer = base64ToBytes(b64);
        let pixels = [];

        for (let n = 0; n < font_data.width * font_data.height; n += buffer.BYTES_PER_ELEMENT * 8) {
            let word = buffer[n / (buffer.BYTES_PER_ELEMENT * 8)];
            for (let o = 0; o < buffer.BYTES_PER_ELEMENT * 8 && n + o < font_data.width * font_data.height; o++) {
                pixels.push(!!(word & (1 << (7 - o))));
            }
        }

        for (let i = 0; i < pixels.length; i += font_data.width) {
            glyph.push(pixels.slice(i, i + font_data.width));
        }

        font_data.glyphs.set(id, glyph);
    }

    return font_data;
}

window.serialize_font = serialize_font;
window.deserialize_font = deserialize_font;
