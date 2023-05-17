import { Accessor, createSignal } from "solid-js";
import Button from "../atoms/Button.jsx";
import Dropdown from "../atoms/Dropdown.jsx";
import Setting from "../molecules/Setting.jsx";
import { parseGlyphOrIndex } from "../utils.js";
import { Corner, FontData, Glyph } from "../utils/FontData.js";
import classes from "./settings.module.css";

export type GlyphSettingsProps = {
    currentGlyph: Accessor<Glyph>,
    currentFont: FontData,
    setCurrentGlyph: (glyph: Glyph) => void,
};

// TODO: have a preview of the new coordinates
// TODO: add buttons for resetting glyph
export default function GlyphSettings(props: GlyphSettingsProps) {
    const [temporaryWidth, setTemporaryWidth] = createSignal(0);
    const [temporaryHeight, setTemporaryHeight] = createSignal(0);
    const [corner, setCorner] = createSignal<Corner>(Corner.TOP_RIGHT);

    const [pasteGlyph, setPasteGlyph] = createSignal("");

    return (<article class={classes.settings}>
        <h2>Paste another glyph</h2>
        <div class={classes.flex}>
            <Setting
                type="text"
                prefix="Glyph:"
                size="small"
                placeholder="u+0041 or A"
                description="Which glyph to paste in; can be the glyph itself, or its unicode index in hexadecimal"
                value={pasteGlyph}
                onChange={setPasteGlyph}
            />
            <Button
                theme="settings"
                onClick={() => {
                    const index = parseGlyphOrIndex(pasteGlyph());
                    setPasteGlyph("");

                    if (index !== undefined) {
                        const glyph = props.currentFont.glyphs.get(index);
                        if (glyph) {
                            props.setCurrentGlyph(glyph.clone());
                        }
                    }
                }}
            >Paste</Button>
        </div>

        <h2>Glyph dimensions</h2>
        <div class={classes.flex}>
            <Setting
                type="number"
                prefix="Width:"
                size="tiny"
                placeholder={() => props.currentGlyph().width}
                description="The global width of glyphs"
                onChange={setTemporaryWidth}
            />
            <Setting
                type="number"
                prefix="Height:"
                size="tiny"
                placeholder={() => props.currentGlyph().height}
                description="The global height of glyphs"
                onChange={setTemporaryHeight}
            />
        </div>
        <div>
            <span>Where to add/remove pixels:</span>
            <Dropdown
                theme="setting"
                values={[
                    ["Top-right", Corner.TOP_RIGHT],
                    ["Top-left", Corner.TOP_LEFT],
                    ["Bottom-right", Corner.BOTTOM_RIGHT],
                    ["Bottom-left", Corner.BOTTOM_LEFT],
                ]}
                onChange={(corner: Corner) => setCorner(corner)}
            />
        </div>
        <Button
            theme="settings"
            onClick={() => {
                const glyph = props.currentGlyph().resize(temporaryWidth(), temporaryHeight(), corner());

                props.setCurrentGlyph(glyph);
            }}
        >
            Resize glyph
        </Button>

        <h2>Glyph metrics</h2>
        <div class={classes.flex}>
            <Setting
                type="number"
                prefix="Baseline:"
                size="tiny"
                value={props.currentGlyph().baseline}
                placeholder={props.currentFont.baseline}
                description="The baseline of the current glyph"
                onChange={(baseline) => {
                    props.setCurrentGlyph(props.currentGlyph().setBaseline(baseline));
                }}
            />
            <Setting
                type="number"
                prefix="Left offset:"
                size="tiny"
                value={props.currentGlyph().leftOffset}
                placeholder={props.currentFont.leftOffset}
                description="The left offset of the current glyph"
                onChange={(leftOffset) => {
                    props.setCurrentGlyph(props.currentGlyph().setLeftOffset(leftOffset));
                }}
            />
        </div>
    </article>);
}
