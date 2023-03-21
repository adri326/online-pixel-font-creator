import { Pannable } from "@shadryx/pptk";
import { PixelPerfectCanvas, PixelPerfectTouch } from "@shadryx/pptk/solid";
import { createMemo, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { FontData } from "../utils/FontData.js";
import UnicodeData from "../utils/UnicodeData.jsx";
import { draw, DrawData } from "./draw.js";
import EditorInfo from "./info.jsx";
import classes from "./style.module.css";
import EditorToolbar from "./toolbar.jsx";
import { EditorOperation, EditorTool } from "./types.js";

export type EditorProps = {
    fontData: FontData,
    setFontData: (data: FontData) => void,
}

export default function Editor(props: EditorProps) {
    const [operation, setOperation] = createSignal<EditorOperation>(EditorOperation.XOR);
    const [tool, setTool] = createSignal<EditorTool>(EditorTool.DRAW);
    const [currentGlyph, setCurrentGlyph] = createSignal(65);

    const drawData = createMemo((): DrawData => {
        return {
            currentGlyph: currentGlyph(),
            cx: 0,
            cy: 0,
            scale: 1
        };;
    });

    const pannable = new Pannable({});

    let canvas: HTMLCanvasElement;
    return <div class={classes.container}>
        <div class={classes.canvas}>
            <PixelPerfectTouch
                preventDefault={true}
                onDown={(_, touches) => pannable.update(touches)}
                onUp={(_, touches) => pannable.update(touches)}
                onMove={(_, touches) => pannable.move(touches)}
            >
                <PixelPerfectCanvas
                    style={{width: "100%", height: "100%"}}
                    onAttach={(_canvas) => {
                        canvas = _canvas;
                        draw(canvas, props.fontData, drawData());
                    }}
                    onResize={() => draw(canvas, props.fontData, drawData())}
                />
            </PixelPerfectTouch>
        </div>
        <EditorToolbar
            operation={operation}
            setOperation={setOperation}
            tool={tool}
            setTool={setTool}
            setCurrentGlyph={setCurrentGlyph}
        />
        <UnicodeData fallback={<i class={classes.info}>Loading unicode data...</i>}>
            <EditorInfo currentGlyph={currentGlyph} />
        </UnicodeData>
    </div>;
}
