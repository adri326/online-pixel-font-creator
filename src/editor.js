import * as utils from "./utils.js";
import {font_data, unicode_data, unicode_blocks, keys_pressed} from "./main.js";

export const editor_canvas = document.getElementById("editor-canvas");
export const editor_ctx = editor_canvas.getContext("2d");
export const editor_info = document.getElementById("editor-info");

export const PREVIEW_MULT = 2;
export const CURRENT_SIZE = 128;
export const CURRENT_PADDING = 16;

const ZOOM_STRENGTH = 0.001;

export const MODE_NONE = 0;
export const MODE_DRAW = 1;
export const MODE_MOVE = 2;
export const MODE_DRAG = 3;

export const OP_XOR = 0;
export const OP_ONE = 1;
export const OP_ZERO = 2;
export const OP_SELECT = 3;
export const OP_DESELECT = 4;

const COLOR_PRIMARY_DARK = "#5E0B15";
const COLOR_PRIMARY_LIGHT = "#90323D";
const COLOR_ALT_DARK = "#BC8034";
const COLOR_ALT_LIGHT = "#CBA574";
const COLOR_GRAY_LIGHT = "#C5C9C7";
const COLOR_GRAY_MEDIUM = "#A0989F";
const COLOR_GRAY_DARK = "#7A6677";
const COLOR_BLACK = "#101010";
const COLOR_WHITE = "#f0f0f0";

const COLOR_BG = COLOR_GRAY_MEDIUM;
const COLOR_PIXEL_WHITE = COLOR_WHITE;
const COLOR_PIXEL_BLACK = "#212326";
const COLOR_GRID = "#403060";
const COLOR_CURRENT = COLOR_PRIMARY_LIGHT;
const COLOR_NEIGHBORS_BG = COLOR_GRAY_LIGHT;
const COLOR_NEIGHBORS_CURRENT_BG = COLOR_WHITE;
const COLOR_NEIGHBORS = COLOR_PRIMARY_LIGHT;
const COLOR_NEIGHBORS_TEXT = COLOR_GRAY_DARK;

export const HOTKEYS = new Map();
HOTKEYS.set("1", () => editor_status.operation = OP_XOR);
HOTKEYS.set("2", () => editor_status.operation = OP_ONE);
HOTKEYS.set("3", () => editor_status.operation = OP_ZERO);
HOTKEYS.set("4", () => editor_status.operation = OP_SELECT);
HOTKEYS.set("5", () => editor_status.operation = OP_DESELECT);
HOTKEYS.set("d", () => editor_status.persistent_mode = MODE_DRAW);
HOTKEYS.set("D", () => {
    editor_status.pixels_selected = new Set()
    elements.button_deselect_all.className = "active";
    setTimeout(() => {
        elements.button_deselect_all.className = "";
    }, 200);
});
HOTKEYS.set("t", () => editor_status.persistent_mode = MODE_MOVE);
HOTKEYS.set("g", () => editor_status.persistent_mode = MODE_DRAG);

const elements = utils.get_elements_by_id({
    button_xor: "button-xor",
    button_one: "button-one",
    button_zero: "button-zero",

    button_draw: "button-draw",
    button_move: "button-move",
    button_select: "button-select",
    button_deselect: "button-deselect",
    button_deselect_all: "button-deselect-all",
    button_drag: "button-drag",

    jump_glyph: "jump-glyph",
});


const _editor_status = new utils.ProxyListener({
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

    tmp_mode: null,
    persistent_mode: MODE_DRAW,
    get mode() {
        return this.tmp_mode ?? this.persistent_mode;
    },

    operation: OP_XOR,
    pixels_covered: new Set(),
    _pixels_selected: new Set(),
    get pixels_selected() {
        return this.pixels_selected_tmp ?? this._pixels_selected;
    },
    set pixels_selected(value) {
        this._pixels_selected = value;
    },
    pixels_selected_tmp: null,
});
export const editor_status = _editor_status.proxy;

// === Input handlers

function editor_get_pixel(x, y) {
    let fd = font_data();

    return [
        Math.floor(
            (x - editor_status.cx - (editor_canvas.width - fd.width * editor_status.pixel_size) / 2)
            / editor_status.pixel_size
        ),
        Math.floor(
            (y - editor_status.cy - (editor_canvas.height - fd.height * editor_status.pixel_size) / 2)
            / editor_status.pixel_size
        ),
    ];
}

function editor_pixel_inside(px, py) {
    let fd = font_data();
    return px >= 0 && py >= 0 && px < fd.width && py < fd.height;
}

function editor_place_pixel(x, y) {
    let fd = font_data();
    let [px, py] = editor_get_pixel(x, y);

    if (editor_pixel_inside(px, py) && !editor_status.pixels_covered.has(`${px},${py}`)) {
        editor_status.pixels_covered.add(`${px},${py}`);
        let current_glyph = fd.glyphs.get(editor_status.current_glyph);
        if (!current_glyph) {
            current_glyph = utils.new_glyph(fd.width, fd.height);
            fd.glyphs.set(editor_status.current_glyph, current_glyph);
            fd.update("glyphs");
        }
        let previous = current_glyph[py][px];

        if (editor_status.operation === OP_XOR) {
            current_glyph[py][px] = !current_glyph[py][px];
        } else if (editor_status.operation === OP_ONE) {
            current_glyph[py][px] = true;
        } else if (editor_status.operation === OP_ZERO) {
            current_glyph[py][px] = false;
        } else if (editor_status.operation === OP_SELECT) {
            editor_status.pixels_selected.add(`${px},${py}`);
            editor_status.update("pixels_selected");
        } else if (editor_status.operation === OP_DESELECT) {
            editor_status.pixels_selected.delete(`${px},${py}`);
            editor_status.update("pixels_selected");
        }

        if (previous !== current_glyph[py][px]) {
            fd.update("glyphs");
        }
    }

    return false;
}

function editor_apply_drag(x, y) {
    let fd = font_data();

    editor_status.pixels_selected_tmp = null;
    let dx = Math.floor((x - editor_status.mouse_down_x) / editor_status.pixel_size);
    let dy = Math.floor((y - editor_status.mouse_down_y) / editor_status.pixel_size);
    let current_glyph = fd.glyphs.get(editor_status.current_glyph);

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

    fd.glyphs.set(editor_status.current_glyph, new_glyph);
    fd.update("glyphs");
    editor_status.pixels_selected = new_selection;
}

function editor_click(x, y) {
    if (editor_status.mode === MODE_DRAW) {
        editor_status.pixels_covered = new Set();
        editor_place_pixel(x, y);
    }
}

function editor_drag(x, y) {
    if (editor_status.mode === MODE_MOVE) {
        editor_status.cx = editor_status.old_cx + x - editor_status.mouse_down_x;
        editor_status.cy = editor_status.old_cy + y - editor_status.mouse_down_y;
        draw();
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
}

function editor_commit_history() {
    // Check if the current glyph is different from the previous glyph in the history
    let fd = font_data();

    let current_glyph = fd.glyphs.get(editor_status.current_glyph);
    function should_commit() {
        let last_glyph = fd.history.findLastIndex(entry => entry.id === editor_status.current_glyph);
        if (current_glyph && last_glyph !== -1) {
            last_glyph = fd.history[last_glyph];
            for (let y = 0; y < fd.height; y++) {
                for (let x = 0; x < fd.width; x++) {
                    if (last_glyph.data[y][x] != current_glyph[y][x]) {
                        return true;
                    }
                }
            }
        } else if (current_glyph) return true;

        return false;
    }

    if (should_commit()) {
        fd.history.push({
            id: editor_status.current_glyph,
            data: current_glyph.map(row => [...row]),
        });
    }
}

export function editor_undo() {
    let fd = font_data();

    let last_glyph = fd.history.findLastIndex(entry => entry.id === editor_status.current_glyph);
    let second_last_glyph = fd.history.findSecondLastIndex(entry => entry.id === editor_status.current_glyph);
    if (second_last_glyph !== -1) {
        fd.glyphs.set(editor_status.current_glyph, fd.history[second_last_glyph].data);
        fd.history.splice(last_glyph, 1);
        fd.update("history");
    } else if (last_glyph !== -1) {
        fd.glyphs.set(editor_status.current_glyph, utils.new_glyph(fd.width, fd.height));
        fd.history.splice(last_glyph, 1);
        fd.update("history");
    }
}

export function update_info() {
    function pad(str, length) {
        if (str.length < length) return '0'.repeat(length - str.length) + str;
        else return str;
    }

    let info_text = `U+${pad(editor_status.current_glyph.toString(16), 4)}`;
    info_text += ` (${editor_status.current_glyph}): `;
    info_text += `"${utils.to_utf16(editor_status.current_glyph)}" `;
    info_text += unicode_data.get(editor_status.current_glyph); // Returns undefined for the CJK characters
    let block = (unicode_blocks ?? []).find(block => block[0] <= editor_status.current_glyph && block[1] >= editor_status.current_glyph);
    if (block) {
        info_text += `; Block: ${block[2]}`;
    }

    editor_info.innerText = info_text;
}

const operation_buttons = new Map([
    [OP_XOR, elements.button_xor],
    [OP_ONE, elements.button_one],
    [OP_ZERO, elements.button_zero],
    [OP_SELECT, elements.button_select],
    [OP_DESELECT, elements.button_deselect],
]);

const mode_buttons = new Map([
    [MODE_DRAW, elements.button_draw],
    [MODE_MOVE, elements.button_move],
    [MODE_DRAG, elements.button_drag],
]);

export function update_buttons() {
    for (let [op, button] of operation_buttons) {
        if (editor_status.operation === op) {
            button.classList.add("active");
        } else {
            button.classList.remove("active");
        }
    }

    for (let [mode, button] of mode_buttons) {
        if (editor_status.mode === mode) {
            button.classList.add("active");
        } else {
            button.classList.remove("active");
        }
    }
}

export function keydown(event) {
    if (event.key === "ArrowLeft" && editor_status.current_glyph > 0) {
        editor_status.current_glyph -= 1;
    } else if (event.key === "ArrowRight" && editor_status.current_glyph < 0x1FFFF) {
        editor_status.current_glyph += 1;
    } else if (HOTKEYS.get(event.key) && !event.altKey && !event.ctrlKey && !event.metaKey) {
        HOTKEYS.get(event.key)();
    } else if (event.key === "z" && event.ctrlKey) {
        editor_undo();
    }
}

// === Draw ===

export function draw() {
    let fd = font_data();

    editor_ctx.fillStyle = COLOR_BG;
    editor_ctx.fillRect(0, 0, editor_canvas.width, editor_canvas.height);

    function editor_pos(x, y) {
        return [
            x * editor_status.pixel_size + editor_status.cx + (editor_canvas.width - fd.width * editor_status.pixel_size) / 2,
            y * editor_status.pixel_size + editor_status.cy + (editor_canvas.height - fd.height * editor_status.pixel_size) / 2
        ];
    }

    // Adds 0.5 to x and y to produce pixel-perfect lines
    function offset_half([x, y]) {
        return [Math.round(x) + 0.5, Math.round(y) + 0.5];
    }

    function round([x, y]) {
        return [Math.round(x), Math.round(y)];
    }

    // Utility function for use with fillRect, that accepts a width/height pair instead of x2/y2
    function diff([x1, y1], [x2, y2]) {
        return [x2 - x1, y2 - y1];
    }

    function rect(x1, y1, x2, y2, margin = 0) {
        let [rx1, ry1] = round(editor_pos(x1, y1));
        let [rx2, ry2] = round(editor_pos(x2, y2));
        return editor_ctx.fillRect(
            rx1 + margin, ry1 + margin,
            rx2 - rx1 - margin * 2 + 1, ry2 - ry1 - margin * 2 + 1
        );
    }

    editor_ctx.fillStyle = COLOR_CURRENT;
    editor_ctx.font = CURRENT_SIZE + "px monospace";
    editor_ctx.textAlign = "center";
    editor_ctx.textBaseline = "middle";
    editor_ctx.fillText(utils.to_utf16(editor_status.current_glyph), CURRENT_SIZE / 2 + CURRENT_PADDING, CURRENT_SIZE / 2 + CURRENT_PADDING);

    // Draw background
    editor_ctx.fillStyle = COLOR_PIXEL_WHITE;
    if (editor_status.pixel_size * Math.max(fd.width, fd.height) <= 640) {
        editor_ctx.shadowColor = COLOR_GRAY_DARK + "80";
        editor_ctx.shadowOffsetX = 0;
        editor_ctx.shadowOffsetY = editor_status.pixel_size * .25;
        editor_ctx.shadowBlur = editor_status.pixel_size * .75;
        rect(0, 0, fd.width, fd.height);
        editor_ctx.shadowColor = "transparent";
    } else {
        // Drop shadows are disabled when zooming in too much (or else it lags the browser)
        rect(0, 0, fd.width, fd.height);
    }

    let current_glyph = fd.glyphs.get(editor_status.current_glyph);

    // Draw pixels
    if (current_glyph) {
        editor_ctx.fillStyle = COLOR_PIXEL_BLACK;
        for (let y = 0; y < fd.height; y++) {
            for (let x = 0; x < fd.width; x++) {
                if (current_glyph[y][x]) {
                    rect(x, y, x + 1, y + 1);
                }
                if (editor_status.pixels_selected.has(`${x},${y}`)) {
                    editor_ctx.fillStyle = COLOR_ALT_DARK;
                    // TODO: put in a function :)
                    // Sides
                    if (!editor_status.pixels_selected.has(`${x-1},${y}`)) rect(x, y, x + 0.25, y + 1);
                    if (!editor_status.pixels_selected.has(`${x},${y-1}`)) rect(x, y, x + 1, y + 0.25);
                    if (!editor_status.pixels_selected.has(`${x+1},${y}`)) rect(x + 0.75, y, x + 1, y + 1);
                    if (!editor_status.pixels_selected.has(`${x},${y+1}`)) rect(x, y + 0.75, x + 1, y + 1);
                    // Corners
                    if (!editor_status.pixels_selected.has(`${x-1},${y-1}`)) rect(x, y, x + 0.25, y + 0.25);
                    if (!editor_status.pixels_selected.has(`${x+1},${y-1}`)) rect(x + 0.75, y, x + 1, y + 0.25);
                    if (!editor_status.pixels_selected.has(`${x+1},${y+1}`)) rect(x + 0.75, y + 0.75, x + 1, y + 1);
                    if (!editor_status.pixels_selected.has(`${x-1},${y+1}`)) rect(x, y + 0.75, x + 0.25, y + 1);
                    editor_ctx.fillStyle = COLOR_PIXEL_BLACK;
                }
            }
        }
    }

    // Draw grid
    editor_ctx.beginPath();
    for (let x = 0; x <= fd.width; x++) {
        editor_ctx.moveTo(...offset_half(editor_pos(x, 0)));
        editor_ctx.lineTo(...offset_half(editor_pos(x, fd.height)));
    }

    for (let y = 0; y <= fd.height; y++) {
        editor_ctx.moveTo(...offset_half(editor_pos(0, y)));
        editor_ctx.lineTo(...offset_half(editor_pos(fd.width, y)));
    }

    editor_ctx.lineWidth = 1;
    editor_ctx.strokeStyle = COLOR_GRID;
    editor_ctx.stroke();

    // Draw guides

    editor_ctx.beginPath();
    editor_ctx.moveTo(...offset_half(editor_pos(0, fd.baseline)));
    editor_ctx.lineTo(...offset_half(editor_pos(fd.width, fd.baseline)));

    editor_ctx.lineWidth = 3;
    editor_ctx.strokeStyle = COLOR_ALT_LIGHT;
    editor_ctx.stroke();

    editor_ctx.beginPath();
    editor_ctx.moveTo(...offset_half(editor_pos(0, fd.baseline - fd.descend)));
    editor_ctx.lineTo(...offset_half(editor_pos(fd.width, fd.baseline - fd.descend)));
    editor_ctx.moveTo(...offset_half(editor_pos(0, fd.baseline - fd.ascend)));
    editor_ctx.lineTo(...offset_half(editor_pos(fd.width, fd.baseline - fd.ascend)));
    editor_ctx.moveTo(...offset_half(editor_pos(fd.em_size, 0)));
    editor_ctx.lineTo(...offset_half(editor_pos(fd.em_size, fd.height)));

    editor_ctx.lineWidth = 3;
    editor_ctx.strokeStyle = COLOR_GRID;
    editor_ctx.stroke();

    // Draw next and previous characters

    editor_ctx.fillStyle = COLOR_NEIGHBORS_BG;
    editor_ctx.fillRect(
        0,
        editor_canvas.height - (fd.height + 2) * PREVIEW_MULT,
        editor_canvas.width,
        (fd.height + 2) * PREVIEW_MULT
    );

    let n_chars = Math.floor(editor_canvas.width / (fd.width + 2) / PREVIEW_MULT);

    editor_ctx.font = (fd.height * PREVIEW_MULT * 0.75) + "px monospace";
    for (let n = 0; n < n_chars; n++) {
        let offset = n - Math.round(n_chars / 2);
        let x = (n * (fd.width + 2) + 1) * PREVIEW_MULT;
        let y = editor_canvas.height - (fd.height + 1) * PREVIEW_MULT;

        if (offset === 0) {
            editor_ctx.fillStyle = COLOR_NEIGHBORS_CURRENT_BG;
            editor_ctx.fillRect(
                x - PREVIEW_MULT,
                y - PREVIEW_MULT,
                (fd.width + 2) * PREVIEW_MULT,
                (fd.height + 2) * PREVIEW_MULT
            );
        }

        if (editor_status.current_glyph + offset < 0 || editor_status.current_glyph + offset > 0x1FFFF) continue;

        let current_glyph = fd.glyphs.get(editor_status.current_glyph + offset);
        let drew_pixel = false;
        if (current_glyph) {
            editor_ctx.fillStyle = COLOR_NEIGHBORS;
            for (let dy = 0; dy < fd.height; dy++) {
                for (let dx = 0; dx < fd.width; dx++) {
                    if (!current_glyph[dy][dx]) continue;
                    drew_pixel = true;
                    editor_ctx.fillRect(
                        x + dx * PREVIEW_MULT,
                        y + dy * PREVIEW_MULT,
                        PREVIEW_MULT,
                        PREVIEW_MULT
                    );
                }
            }
        }
        if (!current_glyph || !drew_pixel) {
            editor_ctx.fillStyle = COLOR_NEIGHBORS_TEXT;
            editor_ctx.fillText(
                utils.to_utf16(editor_status.current_glyph + offset),
                x + fd.width * PREVIEW_MULT / 2,
                y + fd.height * PREVIEW_MULT / 2 + PREVIEW_MULT
            );
        }
    }
}

export function init() {
    editor_canvas.addEventListener("mousedown", (event) => {
        let fd = font_data();
        editor_status.mouse_down = true;
        editor_status.mouse_down_x = event.clientX;
        editor_status.mouse_down_y = event.clientY;

        if (event.button === 2) {
            editor_status.tmp_mode = MODE_NONE;
        } else if (event.clientY >= editor_canvas.height - (fd.height + 2) * PREVIEW_MULT) {
            editor_status.tmp_mode = MODE_NONE;
            let n_chars = Math.floor(editor_canvas.width / (fd.width + 2) / PREVIEW_MULT);
            let offset = Math.floor(event.clientX / (fd.width + 2) / PREVIEW_MULT) - Math.round(n_chars / 2);
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
    });

    elements.jump_glyph.addEventListener("change", (event) => {
        let match = /^(?:U\+)?([0-9A-F]{4,6})$/i.exec(elements.jump_glyph.value);
        if (match) {
            editor_status.current_glyph = Number.parseInt(match[1], 16);
            update_info();
            elements.jump_glyph.value = "";
        } else if (elements.jump_glyph.value) {
            editor_status.current_glyph = utils.from_utf16(elements.jump_glyph.value);
            if (editor_status.current_glyph < 0 || editor_status.current_glyph > 0x1FFFF) {
                editor_status.current_glyph = elements.jump_glyph.value.charCodeAt(0);
            }
            update_info();
            elements.jump_glyph.value = "";
        }
    });

    for (let [op, button] of operation_buttons) {
        button.addEventListener("click", () => {
            editor_status.operation = op;
        });
    }

    for (let [mode, button] of mode_buttons) {
        button.addEventListener("click", () => {
            editor_status.persistent_mode = mode;
        });
    }

    elements.button_deselect_all.addEventListener("click", () => {
        editor_status.pixels_selected = new Set();
    });

    editor_status.listen((target, property) => {
        if (property === "hovered") return;
        utils.schedule_frame(draw);
    });

    font_data().listen((target, property) => {
        utils.schedule_frame(draw);
    });

    editor_status.listen((target, property) => {
        if (property === "operation" || property === "tmp_mode" || property === "persistent_mode") {
            update_buttons();
        }
    });
}
