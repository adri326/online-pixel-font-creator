import { Accessor, createSignal } from "solid-js";
import { SetStoreFunction } from "solid-js/store";
import Button from "../atoms/Button.jsx";
import Dropdown from "../atoms/Dropdown.jsx";
import Setting from "../molecules/Setting.jsx";
import { Corner, FontData, Glyph } from "../utils/FontData.js";
import classes from "./settings.module.css";

export type GlyphSettingsProps = {
    currentGlyph: Accessor<Glyph>,
    setCurrentGlyph: (glyph: Glyph) => void,
};

export default function GlyphSettings(props: GlyphSettingsProps) {
    const [temporaryWidth, setTemporaryWidth] = createSignal(0);
    const [temporaryHeight, setTemporaryHeight] = createSignal(0);
    const [corner, setCorner] = createSignal<Corner>(Corner.TOP_RIGHT);

    return (<article class={classes["glyph-settings"]}>
        <h2>Glyph dimensions</h2>
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
        <Button
            theme="settings"
            onClick={() => {
                // TODO: add corner snapping dropdown
                const glyph = props.currentGlyph().resize(temporaryWidth(), temporaryHeight(), corner());

                props.setCurrentGlyph(glyph);
            }}
        >
            Resize glyph
        </Button>
    </article>);
}
