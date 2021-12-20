import {unicode_data} from "./main.js";
import {bytesToBase64, base64ToBytes} from "./base64.js";

// Data is stored as base64, with characters encoded as big endian 8-bit numbers

export function serialize_font(font_data) {
    let res = font_data.name.replace(/\n/g, "\\n") + "\n";
    res += font_data.author.replace(/\n/g, "\\n") + "\n";
    res += font_data.style.replace(/\n/g, "\\n") + "\n";
    res += `${font_data.width}:${font_data.height}`;
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

    let name = iter.next().value.replace(/\\n/g, "\n");
    let author = iter.next().value.replace(/\\n/g, "\n");
    let style = iter.next().value.replace(/\\n/g, "\n");

    let spacing = iter.next().value.split(":").map(x => +x);

    console.log(spacing);

    let font_data = {
        width: spacing[0],
        height: spacing[1],
        baseline: spacing[2],
        ascend: spacing[3],
        descend: spacing[4],
        spacing: spacing[5],
        em_size: spacing[6],

        glyphs: new Map(),
        history: [],

        name,
        author,
        style
    };

    for (let raw_glyph of iter) {
        if (!raw_glyph.trim()) continue;
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

function generate_path_for_region(region, font_data, path) {
    let corners = [];

    function get(x, y) {
        if (x >= 0 && x < font_data.width && y >= 0 && y < font_data.height) {
            return region[x + y * font_data.width];
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

    if (!corners.length) return;

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

    function coords(x, y) {
        return [PIXEL_SIZE * x, PIXEL_SIZE * -(y - font_data.baseline)];
    }

    for (let loop of loops) {
        loop.reverse();
        if (loop.length < 4) continue;
        path.moveTo(...coords(corners[loop[0]][0], corners[loop[0]][1]));
        for (let n = 1; n < loop.length; n++) {
            path.lineTo(...coords(corners[loop[n]][0], corners[loop[n]][1]));
        }
        path.lineTo(...coords(corners[loop[0]][0], corners[loop[0]][1]));
    }
}

export function generate_truetype(font_data) {
    let visual_width = PIXEL_SIZE * (font_data.width + font_data.spacing);
    let notdef_glyph = new opentype.Glyph({
        name: ".notdef",
        unicode: 0,
        advanceWidth: visual_width,
        path: new opentype.Path()
    });

    let glyphs = [notdef_glyph];


    for (let [id, glyph] of font_data.glyphs) {
        let name = unicode_data.get(id);
        let path = new opentype.Path();
        let explored = new Array(font_data.width * font_data.height).fill(false);
        let is_empty = true;

        function bfs(sx, sy) {
            let open = [[sx, sy]];
            let res = new Array(font_data.width * font_data.height).fill(false);
            let current;

            while (current = open.pop()) {
                let [x, y] = current;
                res[x + y * font_data.height] = true;
                for (let [dx, dy] of [[-1, 0], [0, -1], [1, 0], [0, 1]]) {
                    if (x + dx < 0 || x + dx >= font_data.width || y + dy < 0 || y + dy >= font_data.height) continue;
                    let index = x + dx + (y + dy) * font_data.width;
                    if (glyph[y + dy][x + dx] && !explored[index]) {
                        explored[index] = true;
                        open.push([x + dx, y + dy]);
                    }
                }
            }

            return res;
        }

        for (let y = 0; y < font_data.height; y++) {
            for (let x = 0; x < font_data.width; x++) {
                if (!explored[x + y * font_data.width] && glyph[y][x]) {
                    is_empty = false;
                    explored[x + y * font_data.width] = true;
                    generate_path_for_region(bfs(x, y), font_data, path);
                } else {
                    explored[x + y * font_data.width] = true;
                }
            }
        }

        if (!is_empty) {
            glyphs.push(new opentype.Glyph({
                name,
                unicode: id,
                advanceWidth: visual_width,
                path,
            }));
        }
    }

    let font = new opentype.Font({
        familyName: font_data.name,
        styleName: font_data.style || "Medium",
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
