import { attachTouch, Pannable, Touch } from "@shadryx/pptk";
import { PixelPerfectCanvas, PixelPerfectTouch } from "@shadryx/pptk/solid";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
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

    const [touchElement, setTouchElement] = createSignal<HTMLElement>();

    // TODO: don't mutate pannable
    const pannable = new Pannable({});
    const [pannableState, setPannableState] = createSignal({
        dx: 0,
        dy: 0,
        scale: 1
    });

    const drawData = createMemo((): DrawData => {
        const state = pannableState();
        return {
            currentGlyph: currentGlyph(),
            cx: state.dx,
            cy: state.dy,
            scale: state.scale
        };;
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
            (event.clientX - bounding.x - bounding.width / 2) * window.devicePixelRatio,
            (event.clientY - bounding.y - bounding.height / 2) * window.devicePixelRatio
        );
        setPannableState(pannable.getState());

        // draw(canvas, props.fontData, drawData());
    }

    createEffect(() => {
        const element = touchElement();
        if (!element) return;

        const currentTool = tool();
        function filterTouchMap(touchMap: Map<number, Touch>): Map<number, Touch> {
            const res: Map<number, Touch> = new Map();

            for (const [index, touch] of touchMap.entries()) {
                // TODO: also accept middle mouse button
                if (currentTool === EditorTool.PAN || touch.type === "touch") {
                    res.set(index, touch);
                }
            }

            return res;
        }

        element.addEventListener("wheel", onScroll);
        const cleanupTouch = attachTouch(element, {
            onDown(touch, touchMap) {
                pannable.update(filterTouchMap(touchMap));
            },
            onUp(touch, touchMap) {
                pannable.update(filterTouchMap(touchMap));
            },
            onMove(affected, touchMap) {
                pannable.move(filterTouchMap(touchMap));
                setPannableState(pannable.getState());
            }
        });

        onCleanup(() => {
            element.removeEventListener("wheel", onScroll);
            cleanupTouch();
        });
    });

    createEffect(() => {
        if (!canvas) return;
        draw(canvas, props.fontData, drawData());
    });

    let canvas: HTMLCanvasElement;
    return <div class={classes.container}>
        <div class={classes.canvas}>
            <PixelPerfectTouch
                preventDefault={true}
                onDown={(_, touches) => pannable.update(touches)}
                onUp={(_, touches) => pannable.update(touches)}
                onMove={(_, touches) => pannable.move(touches)}
                onMount={setTouchElement}
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
