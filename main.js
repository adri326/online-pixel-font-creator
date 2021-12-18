import {draw, PREVIEW_MULT} from "./draw.js";
import {attach_resizer} from "./resize.js";
import {serialize_font, deserialize_font, generate_truetype} from "./convert.js";
import * as editor from "./editor.js";
import * as preview from "./preview.js";
window.editor = editor;

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
const button_upload = document.getElementById("button-upload");

const import_menu = document.getElementById("import-menu");

export let unicode_data = null;
export let unicode_blocks = null;

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

export function set_font_data(data) {
    window.font_data = font_data = data;
    draw();
}

export let keys_pressed = new Map();

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
    editor.editor_info.classList.remove("loading");
    editor.update_info();
});

export function resize() {
    editor.editor_canvas.width = editor.editor_canvas.clientWidth;
    editor.editor_canvas.height = editor.editor_canvas.clientHeight;

    preview.preview_canvas.width = preview.preview_canvas.clientWidth;
    preview.preview_canvas.height = preview.preview_canvas.clientHeight;

    draw();
    preview.draw();
}

export function new_glyph(height = font_data.height, width = font_data.width) {
    return new Array(height).fill(null).map(_ => new Array(width).fill(false));
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
    preview.draw();
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
            editor.update_info();
        } else if (event.key === "ArrowRight" && editor_status.current_glyph < 0x1FFFF) {
            editor_status.current_glyph += 1;
            draw();
            editor.update_info();
        } else if (editor.HOTKEYS.get(event.key) && !event.altKey && !event.ctrlKey && !event.metaKey) {
            editor.HOTKEYS.get(event.key)();
            draw();
            editor.update_buttons();
        } else if (event.key === "z" && event.ctrlKey) {
            editor.editor_undo();
        }
    }
});

window.addEventListener("keyup", (event) => {
    keys_pressed.set(event.key, false);
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
    preview.draw();
});

function update_spacing() {
    if (input_baseline.value && !isNaN(+input_baseline.value)) font_data.baseline = +input_baseline.value;
    if (input_ascend.value && !isNaN(+input_ascend.value)) font_data.ascend = +input_ascend.value;
    if (input_descend.value && !isNaN(+input_descend.value)) font_data.descend = +input_descend.value;
    if (input_spacing.value && !isNaN(+input_spacing.value)) font_data.spacing = +input_spacing.value;
    if (input_em_size.value && !isNaN(+input_em_size.value)) font_data.em_size = +input_em_size.value;

    draw();
    preview.draw();
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

button_upload.addEventListener("click", () => {
    import_menu.classList.remove("hidden");
});

document.querySelectorAll(".upload").forEach((wrapper) => {
    let input = wrapper.querySelector("input[type=file]");
    let label = wrapper.querySelector("label");
    let status = wrapper.querySelector("span");

    input.addEventListener("change", (event) => {
        status.innerText = input.files[0].name;
    });
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

export function parse_utf16(str) {
    let res = [];
    for (let n = 0; n < str.length; n++) {
        let current = str.charCodeAt(n);
        if (current >= 0xD800 && current <= 0xDFFF) {
            n++;
            let low = str.charCodeAt(n);
            res.push((current - 0xD800) * 0x400 + low - 0xDC00 + 0x10000);
        } else {
            res.push(current);
        }
    }
    return res;
}
