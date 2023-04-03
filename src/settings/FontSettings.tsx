import { SetStoreFunction } from "solid-js/store";
import { FontData } from "../utils/FontData.js";

export type FontSettingsProps = {
    currentFont: FontData,
    setCurrentFont: SetStoreFunction<FontData>
};

export default function FontSettings(props: FontSettingsProps) {
    return "Font Settings";
}
