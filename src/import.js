import * as utils from "./utils.js";
import {deserialize_font, load_truetype, load_image} from "./convert.js";
import {set_font_data} from "./main.js";

const elements = utils.get_elements_by_id({
    input_textarea: "paste-file",
    input_file: "import-file",

    import_as_pfs: "import-as-pixel-font",
    import_as_truetype: "import-as-truetype",
    import_as_json_png: "import-as-json-png",

    import_menu: "import-menu",
    close: "import-menu-close",
    error: "import-error",
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

elements.import_as_truetype.addEventListener("click", () => {
    let config_raw = elements.input_textarea.value.split("\n").map(line => line.split("#")[0].trim()).filter(Boolean);
    let config = new Map();

    for (let line of config_raw) {
        let split = line.split(":").map(x => x.trim());
        if (split.length === 2 && split[0] && split[1]) {
            config.set(split[0].toLowerCase(), split[1]);
        }
    }

    if (config.get("width") && config.get("height") && config.get("em_size")) {
        try {
            if (elements.input_file.files.length === 0) {
                throw new Error("No font specified! Please upload a file containing your font.");
            } else if (!Number.isInteger(+config.get("width"))) {
                throw new Error("Invalid width: expected integer, got " + config.get("width"));
            } else if (!Number.isInteger(+config.get("height"))) {
                throw new Error("Invalid height: expected integer, got " + config.get("height"));
            } else if (!Number.isInteger(+config.get("em_size"))) {
                throw new Error("Invalid em_size: expected integer, got " + config.get("em_size"));
            } else if (!Number.isInteger(+config.get("baseline"))) {
                throw new Error("Invalid baseline: expected integer, got " + config.get("baseline"));
            } else if (config.get("baseline") && !Number.isInteger(+config.get("baseline"))) {
                throw new Error("Invalid baseline: expected integer, got " + config.get("baseline"));
            } else if (config.get("left_offset") && !Number.isInteger(+config.get("left_offset"))) {
                throw new Error("Invalid left_offset: expected integer, got " + config.get("left_offset"));
            }

            let reader = new FileReader();
            reader.onload = () => {
                try {
                    set_font_data(load_truetype(
                        opentype.parse(reader.result),
                        +config.get("width"),
                        +config.get("height"),
                        +config.get("em_size"),
                        +config.get("baseline"),
                        +config.get("left_offset"),
                        +(config.get("spacing") || "0"),
                        config.get("name"),
                        config.get("author"),
                        config.get("style")
                    ));
                    close_import_menu();
                } catch (err) {
                    elements.error.innerText = err.name + ": " + err.message;
                    console.error(err);
                }
            }
            reader.readAsArrayBuffer(elements.input_file.files[0]);
        } catch (err) {
            elements.error.innerText = err.name + ": " + err.message;
            console.error(err);
        }
    } else {
        elements.input_textarea.value = `# Importing as truetype requires additional information, which you need to provide here.\n` +
        `# Lines starting with "#" are ignored, they are here to explain to you what the different settings do.\n\n` +
        `# First, specify the width and height of the font in pixels. This can be changed later, but make sure that every characters will fit!\n` +
        `width:\nheight:\n\n` +
        `# Then, specify the size of an em in pixels. With YellowAfterLife's pixel font converter, this is equal to the em size divided by the pixel size.\n` +
        `em_size:\n\n` +
        `# Finally, specify the baseline and left offset of the font in pixels (measured from resp. the top and left of the font).\n` +
        `left_offset: 0\nbaseline:\n\n` +
        `# You can optionally fill in the font spacing, name, author and style here. These will be read from the file otherwise.\n` +
        `spacing:\nname:\nauthor:\nstyle:\n`;
    }
});

elements.import_as_json_png.addEventListener("click", async () => {
    try {
        if (elements.input_textarea.value === "") {
            throw new Error("No JSON provided in the text field!");
        } else if (elements.input_file.files.length === 0) {
            throw new Error("No image specified!");
        }
        let config_raw = JSON.parse(elements.input_textarea.value);

        let config = {
            glyphmap: config_raw["in-glyphs"].map(line => utils.parse_utf16(line)),
            width: config_raw["glyph-width"],
            height: config_raw["glyph-height"],
            offset_x: config_raw["glyph-ofs-x"] || 0,
            offset_y: config_raw["glyph-ofs-y"] || 0,
            separation_x: config_raw["glyph-sep-x"] || 0,
            separation_y: config_raw["glyph-sep-y"] || 0,
            baseline: config_raw["glyph-baseline"],
            spacing: config_raw["glyph-spacing"] || 0,
            name: config_raw["font-name"],
            author: config_raw["font-author"],
            em_size: config_raw["font-em-square"] / config_raw["font-px-size"],
            ascend: config_raw["font-ascend"] / config_raw["font-px-size"],
            descend: config_raw["font-descend"] / config_raw["font-px-size"],
            color: config_raw["glyph-color"],
            left_offset: 0,
        };

        let data_url = await utils.FileReaderPromise.readAsDataURL(elements.input_file.files[0]);
        let image = await utils.data_url_to_image(data_url);
        set_font_data(load_image(image, config));
        close_import_menu();
    } catch (err) {
        elements.error.innerText = err.name + ": " + err.message;
        console.error(err);
    }
});

elements.close.addEventListener("click", close_import_menu);
