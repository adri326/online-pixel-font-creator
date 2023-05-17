import { createMemo, createResource, createSignal } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";
import classes from "./App.module.css";
import Editor from "./Editor/index.jsx";
import Tabbed from "./molecules/Tabbed.jsx";
import FontSettings from "./settings/FontSettings.jsx";
import GlyphSettings from "./settings/GlyphSettings.jsx";
import { FontData, Glyph } from "./utils/FontData.js";

export default function App() {
    const [currentFont, setCurrentFont] = createStore<FontData>({
        width: 8,
        height: 10,
        baseline: 8,
        ascend: 7,
        descend: 0,
        spacing: 1,
        emSize: 8,
        leftOffset: 0,
        glyphs: new Map(),
        // history: [],

        name: "My Amazing Font",
        author: "Anonymous",
        style: "Medium",
    });

    const [currentGlyphIndex, setCurrentGlyphIndex] = createSignal(65);

    const currentGlyph = createMemo(() => {
        return currentFont.glyphs.get(currentGlyphIndex()) ?? new Glyph(currentFont.width, currentFont.height);
    });

    const setCurrentGlyph = (newGlyph: Glyph) => {
        const newGlyphs = new Map(currentFont.glyphs);

        newGlyphs.set(currentGlyphIndex(), newGlyph);
        setCurrentFont("glyphs", newGlyphs);
    };

    return (<div class={classes.App}>
        <Editor
            fontData={currentFont}
            setFontData={setCurrentFont}
            currentGlyphIndex={currentGlyphIndex}
            setCurrentGlyphIndex={setCurrentGlyphIndex}
        />
        <div class={classes["right-panel"]}>
            <Tabbed>
                {{
                    Font: () => <FontSettings currentFont={currentFont} setCurrentFont={setCurrentFont} />,
                    Glyph: () => <GlyphSettings
                        currentGlyph={currentGlyph}
                        setCurrentGlyph={setCurrentGlyph}
                        currentFont={currentFont}
                    />,
                }}
            </Tabbed>
        </div>
    </div>);
}
