import { Touch } from "@shadryx/pptk";
import { PixelPerfectCanvas, PixelPerfectTouch, usePannable } from "@shadryx/pptk/solid";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
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

    const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();
    const [touchElement, setTouchElement] = createSignal<HTMLElement>();

    const [center, setCenter] = createSignal<[cx: number, cy: number]>([0, 0]);

    // TODO: don't mutate pannable
    const pannable = usePannable({
        scale: 64,
        center,
        minScale: 1,
    });

    const drawData = createMemo((): DrawData => {
        const state = pannable.getState();
        return {
            currentGlyph: currentGlyph(),
            cx: state.dx,
            cy: state.dy,
            scale: state.scale
        };
    });

    function onScroll(event: WheelEvent) {
        let deltaY = -event.deltaY;
        if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
            deltaY *= 12;
        }
        const bounding = touchElement()?.getBoundingClientRect() ?? {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };


        pannable.zoom(
            Math.pow(2, deltaY * 0.001 * window.devicePixelRatio),
            (event.clientX - bounding.x) * window.devicePixelRatio,
            (event.clientY - bounding.y) * window.devicePixelRatio
        );
    }

    function filterTouchMap(touchMap: Map<number, Touch>): Map<number, Touch> {
        const res: Map<number, Touch> = new Map();

        for (const [index, touch] of touchMap.entries()) {
            // TODO: also accept middle mouse button
            if (tool() === EditorTool.PAN || touch.type === "touch" || (touch.buttons & 4) > 0) {
                res.set(index, touch);
            }
        }

        return res;
    }

    createEffect(() => {
        const element = touchElement();
        if (!element) return;


        element.addEventListener("wheel", onScroll);

        onCleanup(() => {
            element.removeEventListener("wheel", onScroll);
        });
    });

    createEffect(() => {
        if (!canvas()) return;
        draw(canvas()!, props.fontData, drawData());
    });


    return <div class={classes.container}>
        <div class={classes.canvas}>
            <PixelPerfectTouch
                preventDefault={true}
                onDown={(_, touches) => pannable.update(filterTouchMap(touches))}
                onUp={(_, touches) => pannable.update(filterTouchMap(touches))}
                onMove={(_, touches) => pannable.move(filterTouchMap(touches))}
                onMount={setTouchElement}
            >
                <PixelPerfectCanvas
                    style={{width: "100%", height: "100%"}}
                    onAttach={(canvas) => {
                        setCanvas(canvas);
                        setCenter([canvas.width / 2, canvas.height / 2]);
                    }}
                    onResize={(_, width, height) => {
                        setCenter([width / 2, height / 2]);
                        draw(canvas()!, props.fontData, drawData());
                    }}
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
