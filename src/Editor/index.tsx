import { PixelPerfectCanvas } from "@shadryx/pptk/solid";
import { createSignal } from "solid-js";
import UnicodeData from "../utils/UnicodeData.jsx";
import EditorInfo from "./info.jsx";
import classes from "./style.module.css";
import EditorToolbar from "./toolbar.jsx";
import { EditorOperation, EditorTool } from "./types.js";

function draw(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export default function Editor() {
    const [operation, setOperation] = createSignal<EditorOperation>(EditorOperation.XOR);
    const [tool, setTool] = createSignal<EditorTool>(EditorTool.DRAW);
    const [currentChar, setCurrentChar] = createSignal(65);

    let canvas: HTMLCanvasElement;
    return <div class={classes.container}>
        <PixelPerfectCanvas
            class={classes.canvas}
            onAttach={(_canvas) => {
                canvas = _canvas;
                draw(canvas);
            }}
            onResize={() => draw(canvas)}
        />
        <EditorToolbar
            operation={operation}
            setOperation={setOperation}
            tool={tool}
            setTool={setTool}
            setCurrentChar={setCurrentChar}
        />
        <UnicodeData fallback={<i class={classes.info}>Loading unicode data...</i>}>
            <EditorInfo currentChar={currentChar} />
        </UnicodeData>
    </div>;
}
