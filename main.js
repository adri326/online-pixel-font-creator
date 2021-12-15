const editor_canvas = document.getElementById("editor-canvas");
const editor_ctx = editor_canvas.getContext("2d");
const editor_info = document.getElementById("editor-info");

const button_xor = document.getElementById("button-xor");
const button_one = document.getElementById("button-one");
const button_zero = document.getElementById("button-zero");
const jump_glyph = document.getElementById("jump-glyph");

const ZOOM_STRENGTH = 0.001;
const PREVIEW_MULT = 2;

const MODE_NONE = 0;
const MODE_DRAW = 1;
const MODE_DRAG = 2;

const OP_XOR = 0;
const OP_ONE = 1;
const OP_ZERO = 2;

let unicode_data = null;
let unicode_blocks = null;

let editor_status = {
    current_glyph: 65,
    get pixel_size() {
        return Math.round(Math.pow(2, this.zoom));
    },
    cx: 0,
    cy: 0,
    old_cx: 0,
    old_cy: 0,
    zoom: 5,
    hovered: false,

    tmp_mode: null,
    persistent_mode: MODE_DRAW,
    operation: OP_XOR,

    pixels_covered: new Set(),
    get mode() {
        return this.tmp_mode ?? this.persistent_mode;
    }
}

let font_data = {
    width: 10,
    height: 14,
    glyphs: new Map(),
}

let keys_pressed = new Map();

let loading_promises = [];

loading_promises.push(
    fetch("./UnicodeData.txt")
        .then(res => res.text())
        .then(async raw => {
            unicode_data = new Map();
            let n = 0;
            for (let line of raw.split(/[\n\r]/g)) {
                n += 1;
                if (n % 1000 === 0) await new Promise((res) => setTimeout(res, 10));
                let [codepoint, name] = line.split("#")[0].split(";");
                if (/\./.exec(codepoint)) continue; // Line contains a range, skipping
                codepoint = Number.parseInt(codepoint, 16);
                if (isNaN(codepoint)) continue; // Ignore this codepoint

                unicode_data.set(codepoint, name.trim());
            }
            draw();
        })
);

loading_promises.push(
    fetch("./Blocks.txt")
        .then(res => res.text())
        .then(raw => {
            unicode_blocks = [];
            for (let line of raw.split(/[\n\r]/g)) {
                line = line.split("#")[0].trim();
                if (!line) continue;
                let [range, name] = line.split(";");
                let match = /^([0-9A-F]{4,6})\.\.([0-9A-F]{4,6})$/.exec(range);
                if (!match) continue; // Invalid range syntax
                unicode_blocks.push([Number.parseInt(match[1], 16), Number.parseInt(match[2], 16), name]);
            }
            draw();
        })
);

Promise.all(loading_promises).then(() => {
    editor_info.classList.remove("loading");
    update_info();
});

function resize() {
    editor_canvas.width = editor_canvas.clientWidth;
    editor_canvas.height = editor_canvas.clientHeight;

    draw();
}

function draw() {
    editor_ctx.clearRect(0, 0, editor_canvas.width, editor_canvas.height);

    function editor_pos(x, y) {
        return [x * editor_status.pixel_size + editor_status.cx, y * editor_status.pixel_size + editor_status.cy];
    }

    // Adds 0.5 to x and y to produce pixel-perfect lines
    function offset_half([x, y]) {
        return [x + 0.5, y + 0.5];
    }

    // Draw grid
    let current_glyph = font_data.glyphs.get(editor_status.current_glyph);
    if (current_glyph) {
        editor_ctx.fillStyle = "#212326";
        for (let y = 0; y < font_data.height; y++) {
            for (let x = 0; x < font_data.width; x++) {
                if (current_glyph[y][x]) {
                    editor_ctx.fillRect(...editor_pos(x, y), editor_status.pixel_size, editor_status.pixel_size);
                }
            }
        }
    }

    editor_ctx.beginPath();
    for (let x = 0; x <= font_data.width; x++) {
        editor_ctx.moveTo(...offset_half(editor_pos(x, 0)));
        editor_ctx.lineTo(...offset_half(editor_pos(x, font_data.height)));
    }

    for (let y = 0; y <= font_data.height; y++) {
        editor_ctx.moveTo(...offset_half(editor_pos(0, y)));
        editor_ctx.lineTo(...offset_half(editor_pos(font_data.width, y)));
    }

    editor_ctx.lineWidth = 1;
    editor_ctx.strokeStyle = "#403060";
    editor_ctx.stroke();

    // Draw next and previous characters

    editor_ctx.fillStyle = "#d0d0d0";
    editor_ctx.fillRect(
        0,
        editor_canvas.height - (font_data.height + 2) * PREVIEW_MULT,
        editor_canvas.width,
        (font_data.height + 2) * PREVIEW_MULT
    );

    let n_chars = Math.floor(editor_canvas.width / (font_data.width + 2) / PREVIEW_MULT);

    editor_ctx.font = (font_data.height * PREVIEW_MULT * 0.75) + "px monospace";
    editor_ctx.textAlign = "center";
    editor_ctx.textBaseline = "middle";
    for (let n = 0; n < n_chars; n++) {
        let offset = n - Math.round(n_chars / 2);
        let x = (n * (font_data.width + 2) + 1) * PREVIEW_MULT;
        let y = editor_canvas.height - (font_data.height + 1) * PREVIEW_MULT;

        if (offset === 0) {
            editor_ctx.fillStyle = "#f0f0f0";
            editor_ctx.fillRect(
                x - PREVIEW_MULT,
                y - PREVIEW_MULT,
                (font_data.width + 2) * PREVIEW_MULT,
                (font_data.height + 2) * PREVIEW_MULT
            );
        }

        let current_glyph = font_data.glyphs.get(editor_status.current_glyph + offset);
        if (current_glyph) {
            editor_ctx.fillStyle = "#000000";
            for (let dy = 0; dy < font_data.height; dy++) {
                for (let dx = 0; dx < font_data.width; dx++) {
                    if (!current_glyph[dy][dx]) continue;
                    editor_ctx.fillRect(
                        x + dx * PREVIEW_MULT,
                        y + dy * PREVIEW_MULT,
                        PREVIEW_MULT,
                        PREVIEW_MULT
                    );
                }
            }
        } else {
            editor_ctx.fillStyle = "#808080";
            editor_ctx.fillText(
                String.fromCharCode(editor_status.current_glyph + offset),
                x + font_data.width * PREVIEW_MULT / 2,
                y + font_data.height * PREVIEW_MULT / 2 + PREVIEW_MULT
            );
        }
    }
}

function editor_place_pixel(x, y) {
    let px = Math.floor((x - editor_status.cx) / editor_status.pixel_size);
    let py = Math.floor((y - editor_status.cy) / editor_status.pixel_size);

    if (px >= 0 && py >= 0 && px < font_data.width && py < font_data.height && !editor_status.pixels_covered.has(`${px},${py}`)) {
        editor_status.pixels_covered.add(`${px},${py}`);
        current_glyph = font_data.glyphs.get(editor_status.current_glyph);
        if (!current_glyph) {
            current_glyph = new Array(font_data.height).fill(null).map(_ => new Array(font_data.width).fill(false));
            font_data.glyphs.set(editor_status.current_glyph, current_glyph);
        }
        if (editor_status.operation === OP_XOR) {
            current_glyph[py][px] = !current_glyph[py][px];
        } else if (editor_status.operation === OP_ONE) {
            current_glyph[py][px] = true;
        } else if (editor_status.operation === OP_ZERO) {
            current_glyph[py][px] = false;
        }
    }
}

function editor_click(x, y) {
    if (editor_status.mode === MODE_DRAW) {
        editor_status.pixels_covered = new Set();
        editor_place_pixel(x, y);
    }
    draw();
}

function editor_drag(x, y) {
    if (editor_status.mode === MODE_DRAG) {
        editor_status.cx = editor_status.old_cx + x - editor_status.mouse_down_x;
        editor_status.cy = editor_status.old_cy + y - editor_status.mouse_down_y;
    } else if (editor_status.mode === MODE_DRAW) {
        editor_place_pixel(x, y);
    }
    draw();
}

function update_info() {
    function pad(str, length) {
        if (str.length < length) return '0'.repeat(length - str.length) + str;
        else return str;
    }

    let info_text = `U+${pad(editor_status.current_glyph.toString(16), 4)}`;
    info_text += ` (${editor_status.current_glyph}): `;
    info_text += `"${String.fromCharCode(editor_status.current_glyph)}" `;
    info_text += unicode_data.get(editor_status.current_glyph);
    let block = (unicode_blocks ?? []).find(block => block[0] <= editor_status.current_glyph && block[1] >= editor_status.current_glyph);
    if (block) {
        info_text += `; Block: ${block[2]}`;
    }

    editor_info.innerText = info_text;
}

function update_buttons() {
    button_xor.className = editor_status.operation === OP_XOR ? "active" : "";
    button_one.className = editor_status.operation === OP_ONE ? "active" : "";
    button_zero.className = editor_status.operation === OP_ZERO ? "active" : "";
}

// == Event listeners ==
resize();
window.addEventListener("resize", resize);

window.addEventListener("keydown", (event) => {
    keys_pressed.set(event.key, true);

    if (editor_status.hovered) {
        if (event.key === "ArrowLeft" && editor_status.current_glyph > 0) {
            editor_status.current_glyph -= 1;
            draw();
            update_info();
        } else if (event.key === "ArrowRight" && editor_status.current_glyph < 0x1FFFF) {
            editor_status.current_glyph += 1;
            draw();
            update_info();
        }
    }
});

window.addEventListener("keyup", (event) => {
    keys_pressed.set(event.key, false);
});

editor_canvas.addEventListener("mousedown", (event) => {
    editor_status.mouse_down = true;
    editor_status.mouse_down_x = event.clientX;
    editor_status.mouse_down_y = event.clientY;

    if (event.button === 2) {
        editor_status.tmp_mode = MODE_NONE;
    } else if (event.clientY >= editor_canvas.height - (font_data.height + 2) * PREVIEW_MULT) {
        editor_status.tmp_mode = MODE_NONE;
        let n_chars = Math.floor(editor_canvas.width / (font_data.width + 2) / PREVIEW_MULT);
        let offset = Math.floor(event.clientX / (font_data.width + 2) / PREVIEW_MULT) - Math.floor(n_chars / 2);
        if (offset !== 0 && editor_status.current_glyph + offset >= 0 && editor_status.current_glyph + offset <= 0x1FFFF) {
            editor_status.current_glyph += offset;
            update_info();
        }
    } else if (keys_pressed.get(" ") || event.button === 1) {
        editor_status.tmp_mode = MODE_DRAG;
        editor_canvas.classList.add("drag");
    }

    editor_click(event.clientX, event.clientY, event);
});

editor_canvas.addEventListener("mouseup", (event) => {
    editor_status.mouse_down = false;
    editor_status.old_cx = editor_status.cx;
    editor_status.old_cy = editor_status.cy;

    if (editor_status.tmp_mode === MODE_DRAG) {
        editor_canvas.classList.remove("drag");
    }
    editor_status.tmp_mode = null;
});

editor_canvas.addEventListener("hover", (event) => {
    editor_status.hovered = true;
});

editor_canvas.addEventListener("blur", (event) => {
    editor_status.mouse_down = false;
    editor_status.hovered = false;
});

editor_canvas.addEventListener("mousemove", (event) => {
    editor_status.hovered = true;
    if (editor_status.mouse_down) {
        editor_drag(event.clientX, event.clientY, event);
    }
});

editor_canvas.addEventListener("wheel", (event) => {
    editor_status.zoom += event.deltaY * ZOOM_STRENGTH;
    draw();
});

jump_glyph.addEventListener("change", (event) => {
    if (jump_glyph.value) {
        editor_status.current_glyph = jump_glyph.value.charCodeAt(0);
        draw();
        update_info();
        jump_glyph.value = "";
    }
});
