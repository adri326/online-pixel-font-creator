import { Accessor, onCleanup, Setter } from "solid-js";
import { SetStoreFunction } from "solid-js/store";
import { FontData } from "./utils/FontData.js";
import { saveFont } from "./convert/save.js";

export type ListenersProps = {
    fontData: FontData,
    setFontData: SetStoreFunction<FontData>,
    currentGlyphIndex: Accessor<number>,
    setCurrentGlyphIndex: Setter<number>,
}

export default function Listeners(props: ListenersProps) {
    function onKeyDown(event: KeyboardEvent) {
        console.log(event.code, event.ctrlKey, event.shiftKey);
        if (event.code === "KeyS" && event.ctrlKey && !event.shiftKey) {
            event.preventDefault();
            saveFont(props.fontData);
        }
    }

    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => {
        window.removeEventListener("keydown", onKeyDown);
    });

    return null;
}
