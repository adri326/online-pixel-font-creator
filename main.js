import {draw, PREVIEW_MULT} from "./draw.js";
import {attach_resizer} from "./resize.js";
import {serialize_font, deserialize_font, generate_truetype} from "./convert.js";

Array.prototype.findLastIndex = function(predicate) {
    let l = this.length;
    while (l--) {
        if (predicate(this[l], l, this)) return l;
    }
    return -1;
}

Array.prototype.findSecondLastIndex = function(predicate) {
    let l = this.length;
    let first = true;
    while (l--) {
        if (predicate(this[l], l, this)) {
            if (first) {
                first = false;
            } else {
                return l;
            }
        }
    }
    return -1;
}

const manipulate = document.getElementById("manipulate");

export const editor_canvas = document.getElementById("editor-canvas");
export const editor_ctx = editor_canvas.getContext("2d");
const editor_info = document.getElementById("editor-info");

const button_xor = document.getElementById("button-xor");
const button_one = document.getElementById("button-one");
const button_zero = document.getElementById("button-zero");

const button_draw = document.getElementById("button-draw");
const button_move = document.getElementById("button-move");
const button_select = document.getElementById("button-select");
const button_deselect = document.getElementById("button-deselect");
const button_deselect_all = document.getElementById("button-deselect-all");
const button_drag = document.getElementById("button-drag");

const jump_glyph = document.getElementById("jump-glyph");

// Settings
const button_resize = document.getElementById("button-resize");
const input_width = document.getElementById("input-width");
const input_height = document.getElementById("input-height");
const input_ascend = document.getElementById("input-ascend");
const input_descend = document.getElementById("input-descend");
const input_baseline = document.getElementById("input-baseline");
const input_spacing = document.getElementById("input-spacing");
const input_em_size = document.getElementById("input-em-size");
const button_save_local = document.getElementById("button-save");
const button_load_local = document.getElementById("button-load");
const button_download = document.getElementById("button-download");
const button_download_otf = document.getElementById("button-download-otf");
// const button_upload = document.getElementById("button-upload");

const ZOOM_STRENGTH = 0.001;

const MODE_NONE = 0;
const MODE_DRAW = 1;
const MODE_MOVE = 2;
const MODE_DRAG = 3;

const OP_XOR = 0;
const OP_ONE = 1;
const OP_ZERO = 2;
const OP_SELECT = 3;
const OP_DESELECT = 4;

const HOTKEYS = new Map();
HOTKEYS.set("1", () => editor_status.operation = OP_XOR);
HOTKEYS.set("2", () => editor_status.operation = OP_ONE);
HOTKEYS.set("3", () => editor_status.operation = OP_ZERO);
HOTKEYS.set("4", () => editor_status.operation = OP_SELECT);
HOTKEYS.set("5", () => editor_status.operation = OP_DESELECT);
HOTKEYS.set("d", () => editor_status.persistent_mode = MODE_DRAW);
HOTKEYS.set("D", () => {
    editor_status.pixels_selected = new Set()
    button_deselect_all.className = "active";
    setTimeout(() => {
        button_deselect_all.className = "";
    }, 200);
});
HOTKEYS.set("t", () => editor_status.persistent_mode = MODE_MOVE);
HOTKEYS.set("g", () => editor_status.persistent_mode = MODE_DRAG);

export let unicode_data = null;
export let unicode_blocks = null;

export const editor_status = {
    current_glyph: 65,
    get pixel_size() {
        return Math.pow(2, this.zoom);
    },
    cx: 0,
    cy: 0,
    old_cx: 0,
    old_cy: 0,
    zoom: 5,
    hovered: false,

    _tmp_mode: null,
    set tmp_mode(value) {
        this._tmp_mode = value;
        update_buttons();
    },
    get tmp_mode() {
        return this._tmp_mode;
    },
    _persistent_mode: MODE_DRAW,
    set persistent_mode(value) {
        this._persistent_mode = value;
        update_buttons();
    },
    get persistent_mode() {
        return this._persistent_mode;
    },
    get mode() {
        return this.tmp_mode ?? this.persistent_mode;
    },

    _operation: OP_XOR,
    set operation(value) {
        this._operation = value;
        update_buttons();
    },
    get operation() {
        return this._operation;
    },
    pixels_covered: new Set(),
    _pixels_selected: new Set(),
    get pixels_selected() {
        return this.pixels_selected_tmp ?? this._pixels_selected;
    },
    set pixels_selected(value) {
        this._pixels_selected = value;
    },
    pixels_selected_tmp: null,
};
window.editor_status = editor_status;

export let font_data = {
    width: +(input_width.value || 8),
    height: +(input_height.value || 10),
    baseline: +(input_baseline.value || 8),
    ascend: +(input_ascend.value || 7),
    descend: +(input_descend.value || -1),
    spacing: +(input_spacing.value || 1),
    em_size: +(input_em_size.value || 8),
    glyphs: new Map(),
    history: [],
};

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

export function resize() {
    editor_canvas.width = editor_canvas.clientWidth;
    editor_canvas.height = editor_canvas.clientHeight;

    draw();
}

function new_glyph(height = font_data.height, width = font_data.width) {
    return new Array(height).fill(null).map(_ => new Array(width).fill(false));
}

function editor_get_pixel(x, y) {
    return [
        Math.floor(
            (x - editor_status.cx - (editor_canvas.width - font_data.width * editor_status.pixel_size) / 2)
            / editor_status.pixel_size
        ),
        Math.floor(
            (y - editor_status.cy - (editor_canvas.height - font_data.height * editor_status.pixel_size) / 2)
            / editor_status.pixel_size
        ),
    ];
}

function editor_pixel_inside(px, py) {
    return px >= 0 && py >= 0 && px < font_data.width && py < font_data.height;
}

function editor_place_pixel(x, y) {
    let [px, py] = editor_get_pixel(x, y);

    if (editor_pixel_inside(px, py) && !editor_status.pixels_covered.has(`${px},${py}`)) {
        editor_status.pixels_covered.add(`${px},${py}`);
        let current_glyph = font_data.glyphs.get(editor_status.current_glyph);
        if (!current_glyph) {
            current_glyph = new_glyph();
            font_data.glyphs.set(editor_status.current_glyph, current_glyph);
        }
        if (editor_status.operation === OP_XOR) {
            current_glyph[py][px] = !current_glyph[py][px];
        } else if (editor_status.operation === OP_ONE) {
            current_glyph[py][px] = true;
        } else if (editor_status.operation === OP_ZERO) {
            current_glyph[py][px] = false;
        } else if (editor_status.operation === OP_SELECT) {
            editor_status.pixels_selected.add(`${px},${py}`);
        } else if (editor_status.operation === OP_DESELECT) {
            editor_status.pixels_selected.delete(`${px},${py}`);
        }
    }
}

function editor_apply_drag(x, y) {
    editor_status.pixels_selected_tmp = null;
    let dx = Math.floor((x - editor_status.mouse_down_x) / editor_status.pixel_size);
    let dy = Math.floor((y - editor_status.mouse_down_y) / editor_status.pixel_size);
    let current_glyph = font_data.glyphs.get(editor_status.current_glyph);

    let new_glyph = current_glyph.map(row => [...row]);
    let new_selection = new Set();

    for (let pixel of editor_status._pixels_selected) {
        let [px, py] = pixel.split(",").map(x => +x);
        new_glyph[py][px] = false;
    }

    for (let pixel of editor_status._pixels_selected) {
        let [px, py] = pixel.split(",").map(x => +x);

        if (editor_pixel_inside(px + dx, py + dy)) {
            new_selection.add(`${px + dx},${py + dy}`);
            new_glyph[py + dy][px + dx] = current_glyph[py][px];
        }
    }

    font_data.glyphs.set(editor_status.current_glyph, new_glyph);
    editor_status.pixels_selected = new_selection;

    draw();
}

function editor_click(x, y) {
    if (editor_status.mode === MODE_DRAW) {
        editor_status.pixels_covered = new Set();
        editor_place_pixel(x, y);
    }
    draw();
}

function editor_drag(x, y) {
    if (editor_status.mode === MODE_MOVE) {
        editor_status.cx = editor_status.old_cx + x - editor_status.mouse_down_x;
        editor_status.cy = editor_status.old_cy + y - editor_status.mouse_down_y;
    } else if (editor_status.mode === MODE_DRAW) {
        editor_place_pixel(x, y);
    } else if (editor_status.mode === MODE_DRAG) {
        editor_status.pixels_selected_tmp = new Set();
        let dx = Math.floor((x - editor_status.mouse_down_x) / editor_status.pixel_size);
        let dy = Math.floor((y - editor_status.mouse_down_y) / editor_status.pixel_size);
        for (let pixel of editor_status._pixels_selected) {
            let [px, py] = pixel.split(",").map(x => +x);
            editor_status.pixels_selected_tmp.add(`${px + dx},${py + dy}`);
        }
    }
    draw();
}

function editor_commit_history() {
    // Check if the current glyph is different from the previous glyph in the history
    let current_glyph = font_data.glyphs.get(editor_status.current_glyph);
    function should_commit() {
        let last_glyph = font_data.history.findLastIndex(entry => entry.id === editor_status.current_glyph);
        if (current_glyph && last_glyph !== -1) {
            last_glyph = font_data.history[last_glyph];
            for (let y = 0; y < font_data.height; y++) {
                for (let x = 0; x < font_data.width; x++) {
                    if (last_glyph.data[y][x] != current_glyph[y][x]) {
                        return true;
                    }
                }
            }
        } else if (current_glyph) return true;

        return false;
    }

    if (should_commit()) {
        font_data.history.push({
            id: editor_status.current_glyph,
            data: current_glyph.map(row => [...row]),
        });
    }
}

function editor_undo() {
    let last_glyph = font_data.history.findLastIndex(entry => entry.id === editor_status.current_glyph);
    let second_last_glyph = font_data.history.findSecondLastIndex(entry => entry.id === editor_status.current_glyph);
    if (second_last_glyph !== -1) {
        font_data.glyphs.set(editor_status.current_glyph, font_data.history[second_last_glyph].data);
        font_data.history.splice(last_glyph, 1);
        draw();
    } else if (last_glyph !== -1) {
        font_data.glyphs.set(editor_status.current_glyph, new_glyph());
        font_data.history.splice(last_glyph, 1);
        draw();
    }
}

function update_info() {
    function pad(str, length) {
        if (str.length < length) return '0'.repeat(length - str.length) + str;
        else return str;
    }

    let info_text = `U+${pad(editor_status.current_glyph.toString(16), 4)}`;
    info_text += ` (${editor_status.current_glyph}): `;
    info_text += `"${to_utf16(editor_status.current_glyph)}" `;
    info_text += unicode_data.get(editor_status.current_glyph); // Returns undefined for the CJK characters
    let block = (unicode_blocks ?? []).find(block => block[0] <= editor_status.current_glyph && block[1] >= editor_status.current_glyph);
    if (block) {
        info_text += `; Block: ${block[2]}`;
    }

    editor_info.innerText = info_text;
}

// TODO: use arrays or smth
function update_buttons() {
    button_xor.className = editor_status.operation === OP_XOR ? "active" : "";
    button_one.className = editor_status.operation === OP_ONE ? "active" : "";
    button_zero.className = editor_status.operation === OP_ZERO ? "active" : "";
    button_select.className = editor_status.operation === OP_SELECT ? "active" : "";
    button_deselect.className = editor_status.operation === OP_DESELECT ? "active" : "";

    button_draw.className = editor_status.mode === MODE_DRAW ? "active" : "";
    button_move.className = editor_status.mode === MODE_MOVE ? "active" : "";
    button_drag.className = editor_status.mode === MODE_DRAG ? "active" : "";
}

function load_font() {
    let raw_data = window.localStorage.getItem("font_data");
    if (raw_data) {
        font_data = deserialize_font(raw_data);

        input_width.value = font_data.width;
        input_height.value = font_data.height;

        input_baseline.value = font_data.baseline;
        input_ascend.value = font_data.ascend;
        input_descend.value = font_data.descend;
        input_spacing.value = font_data.spacing;
    }
    draw();
}

function save_font() {
    window.localStorage.setItem("font_data", serialize_font(font_data));
}

// == Event listeners ==
setTimeout(() => {
    resize();
    load_font();
    window.font_data = font_data;
}, 10);
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
        } else if (HOTKEYS.get(event.key) && !event.altKey && !event.ctrlKey && !event.metaKey) {
            HOTKEYS.get(event.key)();
            draw();
            update_buttons();
        } else if (event.key === "z" && event.ctrlKey) {
            editor_undo();
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
        let offset = Math.floor(event.clientX / (font_data.width + 2) / PREVIEW_MULT) - Math.round(n_chars / 2);
        if (offset !== 0 && editor_status.current_glyph + offset >= 0 && editor_status.current_glyph + offset <= 0x1FFFF) {
            editor_status.current_glyph += offset;
            update_info();
        }
    } else if (keys_pressed.get(" ") || event.button === 1) {
        editor_status.tmp_mode = MODE_MOVE;
        editor_canvas.classList.add("drag");
    }

    editor_click(event.clientX, event.clientY, event);
});

editor_canvas.addEventListener("mouseup", (event) => {
    editor_status.mouse_down = false;

    if (editor_status.mode === MODE_DRAG) {
        editor_apply_drag(event.clientX, event.clientY, event);
        editor_commit_history();
    } else if (editor_status.mode === MODE_DRAW) {
        editor_commit_history();
    }

    editor_status.old_cx = editor_status.cx;
    editor_status.old_cy = editor_status.cy;

    if (editor_status.tmp_mode === MODE_MOVE) {
        editor_canvas.classList.remove("drag");
    }
    editor_status.tmp_mode = null;
});

editor_canvas.addEventListener("mouseenter", (event) => {
    editor_status.hovered = true;
});

editor_canvas.addEventListener("mouseleave", (event) => {
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
    editor_status.cx /= Math.pow(2, event.deltaY * ZOOM_STRENGTH);
    editor_status.old_cx = editor_status.cx;
    editor_status.cy /= Math.pow(2, event.deltaY * ZOOM_STRENGTH);
    editor_status.old_cy = editor_status.cy;
    editor_status.zoom -= event.deltaY * ZOOM_STRENGTH;
    draw();
});

jump_glyph.addEventListener("change", (event) => {
    let match = /^(?:U\+)?([0-9A-F]{4,6})$/i.exec(jump_glyph.value);
    if (match) {
        editor_status.current_glyph = Number.parseInt(match[1], 16);
        draw();
        update_info();
        jump_glyph.value = "";
    } else if (jump_glyph.value) {
        editor_status.current_glyph = from_utf16(jump_glyph.value);
        if (editor_status.current_glyph < 0 || editor_status.current_glyph > 0x1FFFF) {
            editor_status.current_glyph = jump_glyph.value.charCodeAt(0);
        }
        draw();
        update_info();
        jump_glyph.value = "";
    }
});


// === Settings ===

button_resize.addEventListener("click", (event) => {
    let width = +(input_width.value || 8);
    let height = +(input_height.value || 8);

    if (!input_width.value && !input_height.value || isNaN(width) || isNaN(height)) return;

    font_data.width = width;
    font_data.height = height;

    for (let [id, glyph] of font_data.glyphs) {
        while (glyph.length > height) glyph.pop();
        for (let row of glyph) {
            while (row.length > width) row.pop();
            while (row.length < width) row.push(false);
        }
        while (glyph.length < height) glyph.push(new Array(width).fill(false));
    }

    font_data.history = []; // Sorry

    draw();
});

function update_spacing() {
    if (input_baseline.value && !isNaN(+input_baseline.value)) font_data.baseline = +input_baseline.value;
    if (input_ascend.value && !isNaN(+input_ascend.value)) font_data.ascend = +input_ascend.value;
    if (input_descend.value && !isNaN(+input_descend.value)) font_data.descend = +input_descend.value;
    if (input_spacing.value && !isNaN(+input_spacing.value)) font_data.spacing = +input_spacing.value;
    if (input_em_size.value && !isNaN(+input_em_size.value)) font_data.em_size = +input_em_size.value;

    draw();
}

input_baseline.addEventListener("change", update_spacing);
input_baseline.addEventListener("keyup", update_spacing);

input_ascend.addEventListener("change", update_spacing);
input_ascend.addEventListener("keyup", update_spacing);

input_descend.addEventListener("change", update_spacing);
input_descend.addEventListener("keyup", update_spacing);

input_spacing.addEventListener("change", update_spacing);
input_spacing.addEventListener("keyup", update_spacing);

input_em_size.addEventListener("change", update_spacing);
input_em_size.addEventListener("keyup", update_spacing);

button_save_local.addEventListener("click", save_font);
button_load_local.addEventListener("click", load_font);

button_download.addEventListener("click", () => {
    let url = window.URL.createObjectURL(new Blob([serialize_font(font_data)], {type: "text/plain"}));
    let a = document.createElement("a");
    a.href = url;
    a.download = "font.pfs";
    a.click();
});

button_download_otf.addEventListener("click", () => {
    generate_truetype(font_data).download();
});

// Of course fromCharCode doesn't handle utf-16, so we have to manually do the conversion and hope it works
export function to_utf16(codepoint) {
    if (codepoint > 0xFFFF) {
        let high = Math.floor((codepoint - 0x10000) / 0x400) + 0xD800;
        let low = (codepoint - 0x10000) % 0x400 + 0xDC00;
        return String.fromCharCode(high, low);
    } else {
        return String.fromCharCode(codepoint);
    }
}

export function from_utf16(str) {
    if (str.length === 2) {
        let high = str.charCodeAt(0);
        let low = str.charCodeAt(1);
        return (high - 0xD800) * 0x400 + low - 0xDC00 + 0x10000;
    } else if (str.length === 1) {
        return str.charCodeAt(0);
    } else {
        return 0;
    }
}
