import { createSignal } from "solid-js";
import { deserializeFont, serializeFont } from "./serialize.js";
import { FontData } from "../utils/FontData.js";

const [saveStatus, setSaveStatus] = createSignal(!!window.localStorage.getItem("font_data"));

console.log(saveStatus());

export {
    saveStatus
};

export function clearSave() {
    window.localStorage.removeItem("font_data");
    setSaveStatus(false);
}

export function saveFont(fontData: FontData) {
    window.localStorage.setItem("font_data", serializeFont(fontData));
    setSaveStatus(true);
}

export function loadFont(): FontData | undefined {
    const saved = window.localStorage.getItem("font_data");
    if (!saved) return undefined;

    return deserializeFont(saved);
}
