import { SetStoreFunction } from "solid-js/store";
import { FontData } from "../utils/FontData.js";

export type GlyphSettingsProps = {
    currentFont: FontData,
    setCurrentFont: SetStoreFunction<FontData>
};

export default function GlyphSettings(props: GlyphSettingsProps) {
    return "Glyph Settings";
}
