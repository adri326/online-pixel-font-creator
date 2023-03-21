import { UTF16FromCharCode } from "../utils.js";
import { useUnicodeData } from "../utils/UnicodeData.jsx";
import classes from "./style.module.css";

export type EditorInfoProps = {
    currentGlyph: () => number,
};

export default function EditorInfo(props: EditorInfoProps) {
    const unicodeData = useUnicodeData();

    return <span class={classes.info}>
        {`U+${props.currentGlyph().toString(16).padStart(4, "0")}`}
        {` (${props.currentGlyph()}): `}
        {`"${UTF16FromCharCode(props.currentGlyph())}" `}
        {unicodeData.get(props.currentGlyph())}
    </span>
}
