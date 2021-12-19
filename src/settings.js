import * as utils from "./utils.js";
import {font_data, set_font_data} from "./main.js";
import {serialize_font, deserialize_font} from "./convert.js";

export const elements = utils.get_elements_by_id({
    button_resize: "button-resize",
    button_save: "button-save",
    button_load: "button-load",
    button_download: "button-download",
    button_download_otf: "button-download-otf",
    button_upload: "button-upload",

    input_width: "input-width",
    input_height: "input-height",
    input_ascend: "input-ascend",
    input_descend: "input-descend",
    input_baseline: "input-baseline",
    input_spacing: "input-spacing",
    input_em_size: "input-em-size",

    import_menu: "import-menu",
});

let spacing_inputs = new Map([
    ["baseline", elements.input_baseline],
    ["ascend", elements.input_ascend],
    ["descend", elements.input_descend],
    ["spacing", elements.input_spacing],
    ["em_size", elements.input_em_size],
]);

export function update_spacing() {
    let fd = font_data();
    for (let [key, input] of spacing_inputs) {
        if (input.value && !isNaN(+input.value) && fd[key] !== +input.value) {
            fd[key] = +input.value;
        }
    }
}

function load_font() {
    let raw_data = window.localStorage.getItem("font_data");
    if (raw_data) {
        set_font_data(deserialize_font(raw_data));
        let fd = font_data();

        elements.input_width.value = fd.width;
        elements.input_height.value = fd.height;

        elements.input_baseline.value = fd.baseline;
        elements.input_ascend.value = fd.ascend;
        elements.input_descend.value = fd.descend;
        elements.input_spacing.value = fd.spacing;
    }
}

function save_font() {
    window.localStorage.setItem("font_data", serialize_font(font_data()));
}

export function init() {
    let fd = font_data();

    for (let [key, input] of spacing_inputs) {
        input.addEventListener("change", update_spacing);
        input.addEventListener("keyup", update_spacing);
    }

    load_font();

    elements.button_save.addEventListener("click", save_font);
    elements.button_load.addEventListener("click", load_font);

    elements.button_download.addEventListener("click", () => {
        let url = window.URL.createObjectURL(new Blob([serialize_font(font_data())], {type: "text/plain"}));
        let a = document.createElement("a");
        a.href = url;
        a.download = "font.pfs";
        a.click();
    });

    elements.button_download_otf.addEventListener("click", () => {
        generate_truetype(font_data()).download();
    });

    elements.button_upload.addEventListener("click", () => {
        elements.import_menu.classList.remove("hidden");
    });
}
