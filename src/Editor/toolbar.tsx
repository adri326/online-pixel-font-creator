import { For } from "solid-js";
import Button from "../atoms/Button.jsx";
import Input from "../atoms/Input.jsx";
import { charCodeFromUTF16, parseUTF16 } from "../utils.js";
import classes from "./style.module.css";
import { EditorOperation, EditorTool } from "./types.js";

export type EditorToolbarProps = {
    operation: () => EditorOperation,
    setOperation: (operation: EditorOperation) => void,

    tool: () => EditorTool,
    setTool: (tool: EditorTool) => void,

    setCurrentGlyph: (currentChar: number | ((previousChar: number) => number)) => void,
};

const OPERATIONS = [
    [EditorOperation.XOR, "XOR"],
    [EditorOperation.ONE, "ONE"],
    [EditorOperation.ZERO, "ZERO"],
    [EditorOperation.SELECT, "SEL"],
    [EditorOperation.DESELECT, "DESEL"],
] as const;

const TOOLS = [
    [EditorTool.DRAW, "Draw"],
    [EditorTool.PAN, "Pan"],
    [EditorTool.DRAG, "Drag"],
] as const;

export default function EditorToolbar(props: EditorToolbarProps) {
    return <div class={classes.toolbar}>
        <Button onClick={() => {}}>Undo</Button>
        <span class={classes.toolbar_text}>Operations:</span>
        <For each={OPERATIONS}>
            {([op, name], index) => {
                return (<Button
                    data-index={index}
                    selected={props.operation() === op}
                    onClick={() => props.setOperation(op)}
                >
                    {name}
                </Button>);
            }}
        </For>
        <span class={classes.toolbar_text}>Tools:</span>
        <For each={TOOLS}>
            {([tool, name], index) => {
                return (<Button
                    data-index={index}
                    selected={props.tool() === tool}
                    onClick={() => props.setTool(tool)}
                >
                    {name}
                </Button>);
            }}
        </For>
        <Input
            size="small"
            onEnter={(rawGlyph, element) => {
                const parsedAbsolute = /^(?:[uU]\+)?([a-fA-F0-9]{4,8})$/.exec(rawGlyph);
                if (parsedAbsolute) {
                    props.setCurrentGlyph(Number.parseInt(parsedAbsolute[1], 16));
                    element.value = "";
                    return;
                }
                const parsedChar = parseUTF16(rawGlyph)[0];
                if (parsedChar) {
                    props.setCurrentGlyph(parsedChar);
                    element.value = "";
                }
            }}
        >
            Jump to glyph
        </Input>
    </div>;
}