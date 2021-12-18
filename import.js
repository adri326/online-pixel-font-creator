import {deserialize_font} from "./convert.js";
import {draw} from "./draw.js";
import {set_font_data} from "./main.js";

const input_textarea = document.getElementById("paste-file");
const input_file = document.getElementById("import-file");

const import_as_pfs = document.getElementById("import-as-pixel-font");

function close_import_menu() {
    document.getElementById("import-menu").classList.add("hidden");
}

input_file.value = "";

import_as_pfs.addEventListener("click", () => {
    function with_text(text) {
        try {
            set_font_data(deserialize_font(text));
            close_import_menu();
            draw();
        } catch (err) {
            console.error(err);
        }
    }
    if (input_file.files.length) {
        let reader = new FileReader();
        reader.onload = () => with_text(reader.result);
        reader.readAsText(input_file.files[0]);
    } else {
        with_text(input_textarea.value);
    }
});

document.getElementById("import-menu-close").addEventListener("click", close_import_menu);
