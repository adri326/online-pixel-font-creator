import { untrack } from "solid-js";
import { SetStoreFunction } from "solid-js/store";
// import Button from "../atoms/Button.jsx";
import Setting from "../molecules/Setting.jsx";
import { FontData } from "../utils/FontData.js";
import classes from "./settings.module.css";

export type FontSettingsProps = {
    currentFont: FontData,
    setCurrentFont: SetStoreFunction<FontData>
};

// TODO: see if the untracks can be removed
export default function FontSettings(props: FontSettingsProps) {
    const setCurrentFont = props.setCurrentFont;

    function createSetter<Name extends keyof FontData>(name: Name, defaultValue: FontData[Name]) {
        return (value: FontData[Name]) => setCurrentFont(name, value || defaultValue);
    }

    return (<article class={classes["font-settings"]}>
        <h2>Font name</h2>
        <Setting
            type="text"
            prefix="Name:"
            placeholder="My Amazing Font"
            description="The font name"
            onChange={createSetter("name", "My Amazing Font")}
        />
        <Setting
            type="text"
            prefix="Author:"
            placeholder="Anonymous"
            description="The font author's name or copyright"
            onChange={createSetter("author", "Anonymous")}
        />
        <Setting
            type="text"
            prefix="Style:"
            placeholder="Medium"
            description="The font style (eg. 'Medium' or 'Light')"
            onChange={createSetter("style", "Medium")}
        />

        <h2>Dimensions</h2>
        <div class={classes.flex}>
            <Setting
                type="number"
                prefix="Width:"
                size="tiny"
                placeholder={() => props.currentFont.width}
                description="The global width of glyphs"
                onChange={(width) => setCurrentFont("width", width)}
            />
            <Setting
                type="number"
                prefix="Height:"
                size="tiny"
                placeholder={() => props.currentFont.height}
                description="The global height of glyphs"
                onChange={(height) => setCurrentFont("height", height)}
            />
            {/* <Button
                theme="settings"
                onClick={() => {
                    // TODO: retro-actively resize glyphs and add corner snapping dropdown
                    setCurrentFont("width", temporaryWidth() || props.currentFont.width);
                    setCurrentFont("height", temporaryHeight() || props.currentFont.height);
                }}
            >
                Resize all glyphs
            </Button> */}
        </div>

        <h2>Spacing</h2>
        <div class={classes.flex}>
            <Setting
                type="number"
                prefix="Baseline:"
                size="tiny"
                value={untrack(() => props.currentFont.baseline)}
                description="The global baseline, which is the line on top of which most characters 'sit'. In pixels from the top of the glyph."
                onChange={createSetter("baseline", 0)}
            />
            <Setting
                type="number"
                prefix="Left offset:"
                size="tiny"
                value={untrack(() => props.currentFont.leftOffset)}
                description="The global left offset, defines where the characters commonly start. Setting it to a higher value will 'shift' the glyphs left, allowing for overlap. In pixels from the left of the glyph."
                onChange={createSetter("leftOffset", 0)}
            />
            <Setting
                type="number"
                prefix="Ascend:"
                size="tiny"
                value={untrack(() => props.currentFont.ascend)}
                description="The global ascend, defines how high up capital letters like 'T' will rise. In pixels from the baseline, going up."
                onChange={createSetter("ascend", 0)}
            />
            <Setting
                type="number"
                prefix="Descend:"
                size="tiny"
                value={untrack(() => props.currentFont.descend)}
                description="The global descend, defines how low letters like 'g' will go below the baseline. In pixels from the baseline, going up (you will thus need a negative value)."
                onChange={createSetter("descend", 0)}
            />
            <Setting
                type="number"
                prefix="Em size:"
                size="tiny"
                value={untrack(() => props.currentFont.emSize)}
                description="The global 'em' size, which is the width of the letter 'M', in pixels from the left offset. To get pixel-perfect results when using the font, you should set the font size to a multiple of this value!"
                onChange={createSetter("emSize", 0)}
            />

            <Setting
                type="number"
                prefix="Spacing:"
                size="tiny"
                value={untrack(() => props.currentFont.spacing)}
                description="The global spacing, defines how spaced out characters should be. If set to 0, then the left offset line of the current character will intersect with the 'em' line of the previous character."
                onChange={createSetter("spacing", 0)}
            />
        </div>
    </article>);
}
