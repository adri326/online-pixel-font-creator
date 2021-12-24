import {unicode_data} from "./main.js";
import {bytesToBase64, base64ToBytes} from "./base64.js";
import {Glyph} from "./glyph.js";

// Data is stored as base64, with characters encoded as big endian 8-bit numbers

export function serialize_font(font_data) {
    let res = font_data.name.replace(/\n/g, "\\n") + "\n";
    res += font_data.author.replace(/\n/g, "\\n") + "\n";
    res += font_data.style.replace(/\n/g, "\\n") + "\n";
    res += `${font_data.width}:${font_data.height}`;
    res += `:${font_data.baseline}:${font_data.ascend}:${font_data.descend}:${font_data.spacing}:${font_data.em_size}`;

    for (let [id, glyph] of font_data.glyphs) {
        let buffer = new Uint8Array(Math.ceil(glyph.width * glyph.height / 8 / Uint8Array.BYTES_PER_ELEMENT));
        let pixels = glyph.data;
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
        if (glyph.width !== font_data.width || glyph.height !== font_data.height || glyph.baseline !== font_data.baseline) {
            res += `:${glyph.width}:${glyph.height}:${glyph.baseline || font_data.baseline}`;
        }
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
        let split = raw_glyph.split(":");
        let [id, b64] = split;
        id = +id;

        let buffer = base64ToBytes(b64);
        let pixels = [];

        let width = split.length === 5 ? +split[2] : font_data.width;
        let height = split.length === 5 ? +split[3] : font_data.height;
        let baseline = split.length === 5 ? +split[4] : font_data.baseline;

        const BITS = buffer.BYTES_PER_ELEMENT * 8;

        for (let n = 0; n < width * height; n += BITS) {
            let word = buffer[n / (BITS)];
            for (let o = 0; o < BITS && n + o < width * height; o++) {
                pixels.push(!!(word & (1 << (BITS - 1 - o))));
            }
        }

        let glyph = Glyph.from_pixels(pixels, width, height, baseline);

        font_data.glyphs.set(id, glyph);
    }

    return font_data;
}

export const PIXEL_SIZE = 128;

function generate_path_for_region(region, glyph, path) {
    let corners = [];

    function get(x, y) {
        if (x >= 0 && x < glyph.width && y >= 0 && y < glyph.height) {
            return region[x + y * glyph.width];
        } else return false;
    }

    for (let y = 0; y <= glyph.height + 1; y++) {
        for (let x = 0; x <= glyph.width + 1; x++) {
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

        while (x >= 0 && x <= glyph.width + 1 && y >= 0 && y <= glyph.height + 1) {
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
        return [PIXEL_SIZE * x, PIXEL_SIZE * -(y - glyph.baseline)];
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
    let notdef_glyph = new opentype.Glyph({
        name: ".notdef",
        unicode: 0,
        advanceWidth: PIXEL_SIZE * (font_data.width + font_data.spacing),
        path: new opentype.Path()
    });

    let glyphs = [notdef_glyph];


    for (let [id, glyph] of font_data.glyphs) {
        let name = unicode_data.get(id);
        let path = new opentype.Path();
        let explored = new Array(glyph.width * glyph.height).fill(false);
        let is_empty = true;

        function bfs(sx, sy) {
            let open = [[sx, sy]];
            let res = new Array(glyph.width * glyph.height).fill(false);
            let current;

            while (current = open.pop()) {
                let [x, y] = current;
                res[x + y * glyph.width] = true;
                for (let [dx, dy] of [[-1, 0], [0, -1], [1, 0], [0, 1]]) {
                    if (x + dx < 0 || x + dx >= glyph.width || y + dy < 0 || y + dy >= glyph.height) continue;
                    let index = x + dx + (y + dy) * glyph.width;
                    if (glyph.get(x + dx, y + dy) && !explored[index]) {
                        explored[index] = true;
                        open.push([x + dx, y + dy]);
                    }
                }
            }

            return res;
        }

        for (let y = 0; y < glyph.height; y++) {
            for (let x = 0; x < glyph.width; x++) {
                if (!explored[x + y * glyph.width] && glyph.get(x, y)) {
                    is_empty = false;
                    explored[x + y * glyph.width] = true;
                    generate_path_for_region(bfs(x, y), glyph, path);
                } else {
                    explored[x + y * glyph.width] = true;
                }
            }
        }

        if (!is_empty) {
            glyphs.push(new opentype.Glyph({
                name,
                unicode: id,
                advanceWidth: PIXEL_SIZE * (glyph.width + font_data.spacing),
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

export function load_truetype(font, width, height, em_size, baseline, spacing, name, author, style) {
    if (!font.supported) {
        throw new Error("Font is not supported!");
    }

    let canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    let ctx = canvas.getContext("2d");
    let glyphs = new Map();
    console.log(font);
    for (let glyph of Object.values(font.glyphs.glyphs)) {
        let id = glyph.unicode;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "black";
        glyph.draw(ctx, 0, baseline, em_size);

        let data = ctx.getImageData(0, 0, width, height).data;
        let table = new Glyph(width, height, baseline);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                table.set(x, y, data[(x + y * width) * 4 + 3] > 128); // Read from alpha channel
            }
        }

        glyphs.set(id, table);
    }

    return {
        name: name || "",
        author: author || "",
        style: style || "",

        width,
        height,
        baseline,
        em_size,

        ascend: font.ascender / font.unitsPerEm * em_size,
        descend: font.descender / font.unitsPerEm * em_size,
        spacing,

        glyphs,
        history: [],
    };
}

export function load_image(image, config) {
    let canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    let ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    let data = ctx.getImageData(0, 0, image.width, image.height).data;

    let pixels = new Array(image.height).fill(null).map(x => new Array(image.width).fill(false));
    for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
            let index = (x + y * image.width) * 4;
            if (config.color === "black" || config.color === "auto") { // Not so auto, but eh
                pixels[y][x] = data[index] === 0 && data[index + 1] === 0 && data[index + 2] === 0;
            } else if (config.color === "white") {
                pixels[y][x] = data[index] === 255 && data[index + 1] === 255 && data[index + 2] === 255;
            } else if (config.color === "opaque") {
                pixels[y][x] = data[index + 3] > 128;
            }
        }
    }

    let glyphs = new Map();

    for (let y = 0; y < config.glyphmap.length; y++) {
        for (let x = 0; x < config.glyphmap[y].length; x++) {
            let id = config.glyphmap[y][x];
            let sx = x * (config.width + config.separation_x) + config.offset_x;
            let sy = y * (config.height + config.separation_y) + config.offset_y;
            let glyph = new Glyph(config.width, config.height, config.baseline);

            for (let dy = 0; dy < config.height; dy++) {
                for (let dx = 0; dx < config.width; dx++) {
                    glyph.set(dx, dy, pixels[sy + dy]?.[sx + dx]);
                }
            }

            glyphs.set(id, glyph);
        }
    }

    return {
        name: config.name,
        author: config.author,
        style: "Medium",

        width: config.width,
        height: config.height,
        glyphs,
        history: [],

        baseline: config.baseline,
        spacing: config.spacing,
        em_size: config.em_size,
        ascend: config.ascend,
        descend: config.descend,
    };
}
