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
        } else if ((event.code === "ArrowLeft" || event.code === "ArrowRight") && !event.ctrlKey) {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                return;
            }

            const offset = event.code === "ArrowLeft" ? -1 : 1;
            let newGlyphIndex = props.currentGlyphIndex() + offset;
            if (newGlyphIndex < 0) newGlyphIndex = 0;
            props.setCurrentGlyphIndex(newGlyphIndex);
        }
    }

    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => {
        window.removeEventListener("keydown", onKeyDown);
    });

    return null;
}
