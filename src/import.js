import * as utils from "./utils.js";
import {deserialize_font} from "./convert.js";
import {set_font_data} from "./main.js";

const elements = utils.get_elements_by_id({
    input_textarea: "pase-file",
    input_file: "import-file",

    import_as_pfs: "import-as-pixel-font",

    import_menu: "import-menu",
    close: "import-menu-close",
});

function close_import_menu() {
    elements.import_menu.classList.add("hidden");
}

elements.input_file.value = "";

elements.import_as_pfs.addEventListener("click", () => {
    function with_text(text) {
        try {
            set_font_data(deserialize_font(text));
            close_import_menu();
        } catch (err) {
            console.error(err);
        }
    }
    if (elements.input_file.files.length) {
        let reader = new FileReader();
        reader.onload = () => with_text(reader.result);
        reader.readAsText(elements.input_file.files[0]);
    } else {
        with_text(elements.input_textarea.value);
    }
});

elements.close.addEventListener("click", close_import_menu);
