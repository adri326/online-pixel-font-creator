import { UTF16FromCharCode } from "../utils.js";
import { useUnicodeData } from "../utils/UnicodeData.jsx";
import classes from "./style.module.css";

export type EditorInfoProps = {
    currentChar: () => number,
};

export default function EditorInfo(props: EditorInfoProps) {
    const unicodeData = useUnicodeData();

    return <span class={classes.info}>
        {`U+${props.currentChar().toString(16).padStart(4, "0")}`}
        {` (${props.currentChar()}): `}
        {`"${UTF16FromCharCode(props.currentChar())}" `}
        {unicodeData.get(props.currentChar())}
    </span>
}
