import * as utils from "./utils.js";
import {font_data, set_font_data} from "./main.js";
import * as convert from "./convert.js";
import * as editor from "./editor.js";
import {Glyph} from "./glyph.js";

export const elements = utils.get_elements_by_id({
    button_resize: "button-resize",
    select_resize: "select-resize-mode",
    button_save: "button-save",
    button_load: "button-load",
    button_download: "button-download",
    button_download_otf: "button-download-otf",
    button_upload: "button-upload",
    button_clear: "button-clear",

    input_name: "input-name",
    input_author: "input-author",
    input_style: "input-style",

    input_width: "input-width",
    input_height: "input-height",
    input_ascend: "input-ascend",
    input_descend: "input-descend",
    input_baseline: "input-baseline",
    input_spacing: "input-spacing",
    input_em_size: "input-em-size",
    input_left_offset: "input-left-offset",

    input_paste_glyph: "input-paste-glyph",
    button_paste_glyph: "button-paste-glyph",
    input_glyph_width: "input-glyph-width",
    input_glyph_height: "input-glyph-height",
    button_glyph_resize: "button-glyph-resize",
    select_glyph_resize: "select-glyph-resize-mode",
    input_glyph_baseline: "input-glyph-baseline",
    input_glyph_left_offset: "input-glyph-left-offset",

    import_menu: "import-menu",
});

let spacing_inputs = new Map([
    ["baseline", elements.input_baseline],
    ["ascend", elements.input_ascend],
    ["descend", elements.input_descend],
    ["spacing", elements.input_spacing],
    ["em_size", elements.input_em_size],
    ["left_offset", elements.input_left_offset],
]);

let glyph_spacing_inputs = new Map([
    ["baseline", elements.input_glyph_baseline],
    ["left_offset", elements.input_glyph_left_offset],
]);

export function update_spacing() {
    let fd = font_data();
    for (let [key, input] of spacing_inputs) {
        if (input.value && !isNaN(+input.value) && fd[key] !== +input.value) {
            fd[key] = +input.value;
        }
    }
}

export function update_glyph_spacing() {
    let fd = font_data();
    let current_glyph = fd.glyphs.get(editor.editor_status.current_glyph) || new Glyph(fd.width, fd.height, fd.baseline);

    for (let [key, input] of glyph_spacing_inputs) {
        if (input.value && !isNaN(+input.value) && current_glyph[key] !== +input.value) {
            current_glyph[key] = +input.value;
        }
    }

    fd.glyphs.set(editor.editor_status.current_glyph, current_glyph);
    fd.update("glyphs");
}

export function update_name() {
    let fd = font_data();
    if (elements.input_name.value && elements.input_name.value !== fd.name) {
        fd.name = elements.input_name.value;
    }
    if (elements.input_author.value && elements.input_author.value !== fd.author) {
        fd.author = elements.input_author.value;
    }
    if (elements.input_style.value && elements.input_style.value !== fd.style) {
        fd.style = elements.input_style.value;
    }
}

export function load_font() {
    try {
        let raw_data = window.localStorage.getItem("font_data");
        if (raw_data) {
            set_font_data(convert.deserialize_font(raw_data));
            let fd = font_data();

            elements.input_width.value = fd.width;
            elements.input_height.value = fd.height;

            elements.input_baseline.value = fd.baseline;
            elements.input_ascend.value = fd.ascend;
            elements.input_descend.value = fd.descend;
            elements.input_spacing.value = fd.spacing;
            elements.input_em_size.value = fd.em_size;

            elements.input_name.value = fd.name || "My Amazing Font";
            elements.input_author.value = fd.author || "Anonymous";
            elements.input_style.value = fd.style || "Medium";
        }
    } catch (err) {
        console.error(err);
    }
}

export function read_from_font() {
    let fd = font_data();

    elements.input_width.value = fd.width;
    elements.input_height.value = fd.height;

    elements.input_baseline.value = fd.baseline;
    elements.input_ascend.value = fd.ascend;
    elements.input_descend.value = fd.descend;
    elements.input_spacing.value = fd.spacing;
    elements.input_em_size.value = fd.em_size;
    elements.input_left_offset.value = fd.left_offset;

    elements.input_name.value = fd.name || "My Amazing Font";
    elements.input_author.value = fd.author || "Anonymous";
    elements.input_style.value = fd.style || "Medium";

    let current_glyph = fd.glyphs.get(editor.editor_status.current_glyph);
    elements.input_glyph_width.value = current_glyph ? current_glyph.width : fd.width;
    elements.input_glyph_height.value = current_glyph ? current_glyph.height : fd.height;
    elements.input_glyph_baseline.value = current_glyph ? current_glyph.baseline : fd.baseline;
    elements.input_glyph_left_offset.value = current_glyph ? current_glyph.left_offset : fd.left_offset;
}

export function save_font(flash_button = false) {
    window.localStorage.setItem("font_data", convert.serialize_font(font_data()));
    if (flash_button) {
        elements.button_save.classList.add("active");
        setTimeout(() => {
            elements.button_save.classList.remove("active");
        }, 200);
    }
}

export function init() {
    let fd = font_data();

    for (let [_, input] of spacing_inputs) {
        input.addEventListener("change", update_spacing);
        input.addEventListener("keyup", update_spacing);
    }

    for (let [_, input] of glyph_spacing_inputs) {
        input.addEventListener("change", update_glyph_spacing);
        input.addEventListener("keyup", update_glyph_spacing);
    }

    elements.input_name.addEventListener("change", update_name);
    elements.input_author.addEventListener("change", update_name);
    elements.input_style.addEventListener("change", update_name);

    load_font();

    elements.button_save.addEventListener("click", save_font);
    elements.button_load.addEventListener("click", load_font);
    elements.button_clear.addEventListener("click", () => {
        window.localStorage.removeItem("font_data");
    });

    elements.button_download.addEventListener("click", () => {
        let fd = font_data();
        let url = window.URL.createObjectURL(new Blob([convert.serialize_font(fd)], {type: "text/plain"}));
        let a = document.createElement("a");
        a.href = url;
        a.download = `${fd.name.replace(/[^a-zA-Z0-9]/g, "")}-${fd.style.replace(/[^a-zA-Z0-9]/g, "")}.pfs`;
        a.click();
    });

    elements.button_download_otf.addEventListener("click", () => {
        convert.generate_truetype(font_data()).download();
    });

    elements.button_upload.addEventListener("click", () => {
        elements.import_menu.classList.remove("hidden");
    });

    elements.button_resize.addEventListener("click", () => {
        let fd = font_data();
        let width = +(elements.input_width.value || 8);
        let height = +(elements.input_height.value || 8);
        let mode = elements.select_resize.value;

        if (!elements.input_width.value && !elements.input_height.value || isNaN(width) || isNaN(height)) return;

        for (let [id, glyph] of fd.glyphs) {
            if (glyph.width !== fd.width || glyph.height !== fd.height || glyph.baseline !== fd.baseline) {
                continue; // Skip already-resized glyphs
            }
            let new_glyph = new Glyph(width, height, glyph.baseline);
            // TODO: inherit properties from glyph
            let sx = mode[1] === "l" ? width - fd.width : 0;
            let sy = mode[0] === "t" ? height - fd.height : 0;

            for (let y = 0; y < fd.height; y++) {
                for (let x = 0; x < fd.width; x++) {
                    new_glyph.set(sx + x, sy + y, glyph.get(x, y));
                }
            }

            // Apparently this is safe?
            fd.glyphs.set(id, new_glyph);
        }
        fd.update("glyphs");

        fd.width = width;
        fd.height = height;
        fd.history = []; // Sorry
    });

    elements.button_glyph_resize.addEventListener("click", () => {
        let fd = font_data();
        let width = +(elements.input_glyph_width.value || 8);
        let height = +(elements.input_glyph_height.value || 8);
        let mode = elements.select_glyph_resize.value;

        if (!elements.input_width.value && !elements.input_height.value || isNaN(width) || isNaN(height)) return;

        let glyph = fd.glyphs.get(editor.editor_status.current_glyph);
        if (glyph) {
            let new_glyph = new Glyph(width, height, glyph.baseline, glyph.left_offset);
            // TODO: inherit properties from glyph
            let sx = mode[1] === "l" ? width - glyph.width : 0;
            let sy = mode[0] === "t" ? height - glyph.height : 0;

            for (let y = 0; y < glyph.height; y++) {
                for (let x = 0; x < glyph.width; x++) {
                    new_glyph.set(sx + x, sy + y, glyph.get(x, y));
                }
            }

            if (mode[0] === "t") {
                new_glyph.baseline += height - glyph.height;
            }

            fd.glyphs.set(editor.editor_status.current_glyph, new_glyph);
        } else {
            fd.glyphs.set(editor.editor_status.current_glyph, new Glyph(width, height, fd.baseline));
        }
        fd.update("glyphs");

        fd.history = fd.history.filter(entry => entry.id !== editor.editor_status.current_glyph); // Sorry
    });

    elements.button_paste_glyph.addEventListener("click", () => {
        let codepoint = utils.parse_glyph_or_codepoint(elements.input_paste_glyph.value);
        if (codepoint) {
            elements.input_paste_glyph.value = "";
            let fd = font_data();
            let glyph = fd.glyphs.get(codepoint);
            let current_glyph = fd.glyphs.get(editor.editor_status.current_glyph) || new Glyph(fd.width, fd.height, fd.baseline, fd.left_offset);
            if (glyph) {
                for (let y = 0; y < fd.height; y++) {
                    for (let x = 0; x < fd.width; x++) {
                        // TODO: use editor operations?
                        current_glyph.set(x, y, glyph.get(x, y));
                    }
                }
                fd.glyphs.set(editor.editor_status.current_glyph, current_glyph);
                fd.update("glyphs");
            }
        }
    });

    font_data().listen((target, property) => {
        if (!property || property === "glyph" || property === "baseline" || property === "width" || property === "height") {
            read_from_font();
        }
    });
    editor.editor_status.listen((target, property) => {
        if (property === "baseline" || property === "current_glyph") {
            read_from_font();
        }
    });
}
