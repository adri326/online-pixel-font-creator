import {ProxyListener} from "./utils.js";
import * as editor from "./editor.js";
import * as settings from "./settings.js";
import * as preview from "./preview.js";
import * as resize from "./resize.js";
import * as utils from "./utils.js";

let _font_data = new ProxyListener({
    width: 8,
    height: 10,
    baseline: 8,
    ascend: 7,
    descend: -1,
    spacing: 1,
    em_size: 8,
    glyphs: new Map(),
    history: [],

    name: "My Amazing Font",
    author: "Anonymous",
    style: "Medium",
});

export function font_data() {
    return _font_data.proxy;
}

export function set_font_data(font_data) {
    _font_data.revoke();
    _font_data = new ProxyListener(font_data, _font_data.listeners);
    _font_data.update();
    settings.read_from_font();
}

export let unicode_data = null;
export let unicode_blocks = null;
let loading_promises = [];

loading_promises.push(
    fetch("./UnicodeData.txt")
        .then(res => res.text())
        .then(async raw => {
            unicode_data = new Map();
            let n = 0;
            for (let line of raw.split(/[\n\r]/g)) {
                if ((++n) % 2500 === 0) await new Promise((res) => setTimeout(res, 0));
                let [codepoint, name] = line.split("#")[0].split(";");
                if (/\./.exec(codepoint)) continue; // Line contains a range, skipping
                codepoint = Number.parseInt(codepoint, 16);
                if (isNaN(codepoint)) continue; // Ignore this codepoint

                unicode_data.set(codepoint, name.trim());
            }
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
        })
);

loading_promises.push(new Promise((resolve) => {
    window.addEventListener("load", resolve);
}));

Promise.all(loading_promises).then(() => {
    editor.editor_info.classList.remove("loading");
    editor.update_info();

    window.addEventListener("keydown", (event) => {
        keys_pressed.set(event.key, true);

        if (event.key === "s" && event.ctrlKey) {
            settings.save_font(true);
            event.preventDefault();
            event.returnValue = ""; // Polyfill
            return false;
        }

        if (editor.editor_status.hovered) {
            editor.keydown(event);
        }
    });

    window.addEventListener("keyup", (event) => {
        keys_pressed.set(event.key, false);
    });

    window.addEventListener("resize", resize_canvas);

    settings.init();
    preview.init();
    editor.init();
    resize.init(resize_canvas);
    utils.register_tabbed();

    _font_data.update();
    resize_canvas();
});

// Resizing
export function resize_canvas() {
    editor.editor_canvas.width = editor.editor_canvas.clientWidth;
    editor.editor_canvas.height = editor.editor_canvas.clientHeight;

    preview.preview_canvas.width = preview.preview_canvas.clientWidth;
    preview.preview_canvas.height = preview.preview_canvas.clientHeight;

    editor.draw();
    preview.draw();
}
window.resize_canvas = resize_canvas;

// Keyboard handler

export let keys_pressed = new Map();
