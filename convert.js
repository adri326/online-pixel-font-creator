import {unicode_data} from "./main.js";
import {bytesToBase64, base64ToBytes} from "./base64.js";

// Data is stored as base64, with characters encoded as big endian 8-bit numbers

export function serialize_font(font_data) {
    let res = `${font_data.width}:${font_data.height}`;
    res += `:${font_data.baseline}:${font_data.ascend}:${font_data.descend}:${font_data.spacing}:${font_data.em_size}`;

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
        em_size: first_line[6],

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

export const PIXEL_SIZE = 128;

export function generate_truetype(font_data) {
    let visual_width = PIXEL_SIZE * (font_data.width + font_data.spacing);
    let notdef_glyph = new opentype.Glyph({
        name: ".notdef",
        unicode: 0,
        advanceWidth: visual_width,
        path: new opentype.Path()
    });

    let glyphs = [notdef_glyph];

    function coords(x, y) {
        return [PIXEL_SIZE * x, PIXEL_SIZE * -(y - font_data.baseline)];
    }

    for (let [id, glyph] of font_data.glyphs) {
        let name = unicode_data.get(id);
        let path = new opentype.Path();
        let corners = [];

        function get(x, y) {
            if (x >= 0 && x < font_data.width && y >= 0 && y < font_data.height) {
                return glyph[y][x];
            } else return false;
        }

        for (let y = 0; y <= font_data.height + 1; y++) {
            for (let x = 0; x <= font_data.width + 1; x++) {
                let topleft = get(x - 1, y - 1);
                let topright = get(x, y - 1);
                let bottomleft = get(x - 1, y);
                let bottomright = get(x, y);

                let sum = topleft + topright + bottomleft + bottomright;
                if (sum % 2 === 1) {
                    let dir_out = [
                        bottomright && !topright,
                        topright && !topleft,
                        topleft && !bottomleft,
                        bottomleft && !bottomright
                    ].indexOf(true);

                    let dir_in = [
                        bottomleft && !topleft,
                        bottomright && !bottomleft,
                        topright && !bottomright,
                        topleft && !topright
                    ].indexOf(true);

                    corners.push([x, y, dir_out, dir_in]);
                } else if (topleft === bottomright && topright === bottomleft && topleft !== topright) {
                    if (topleft) {
                        corners.push([x, y, 2, 3]);
                        corners.push([x, y, 0, 1]);
                    } else {
                        corners.push([x, y, 1, 2]);
                        corners.push([x, y, 3, 0]);
                    }
                }
            }
        }

        if (!corners.length) continue;

        let explored = new Array(corners.length).fill(false);

        function get_direction(dir) {
            if (dir === 0) return [1, 0];
            if (dir === 1) return [0, -1];
            if (dir === 2) return [-1, 0];
            else return [0, 1];
        }

        let loops = [];

        function explore_loop(n, loop) {
            let dir = corners[n][2];
            let [dx, dy] = get_direction(dir);
            let x = corners[n][0];
            let y = corners[n][1];

            while (x >= 0 && x <= font_data.width + 1 && y >= 0 && y <= font_data.height + 1) {
                x += dx;
                y += dy;

                let neighbor = corners.find((c) => c[0] === x && c[1] === y && c[3] === dir);
                if (neighbor) {
                    if (neighbor[4] !== undefined) return; // Loop completed

                    let n2 = corners.indexOf(neighbor);
                    neighbor[4] = loop;
                    loops[loop].push(n2);
                    return explore_loop(n2, loop);
                }
            }
        }

        for (let n = 0; n < corners.length; n++) {
            if (corners[n][4] === undefined) {
                corners[n][4] = loops.length;
                loops.push([n]);
                explore_loop(n, corners[n][4]);
            }
        }

        console.log(id, loops);

        for (let loop of loops) {
            if (loop.length < 4) continue;
            path.moveTo(...coords(corners[loop[0]][0], corners[loop[0]][1]));
            for (let n = 1; n < loop.length; n++) {
                path.lineTo(...coords(corners[loop[n]][0], corners[loop[n]][1]));
            }
            path.lineTo(...coords(corners[loop[0]][0], corners[loop[0]][1]));
        }

        if (loops.length) {
            glyphs.push(new opentype.Glyph({
                name,
                unicode: id,
                advanceWidth: visual_width,
                path,
            }));
        }
    }

    let font = new opentype.Font({
        familyName: "My Font",
        styleName: "Medium",
        unitsPerEm: PIXEL_SIZE * font_data.em_size,
        ascender: PIXEL_SIZE * font_data.ascend,
        descender: PIXEL_SIZE * font_data.descend,
        glyphs,
    });

    return font;
}

window.serialize_font = serialize_font;
window.deserialize_font = deserialize_font;
window.generate_truetype = generate_truetype;
