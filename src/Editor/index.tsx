import { Touch } from "@shadryx/pptk";
import { PixelPerfectCanvas, PixelPerfectTouch, usePannable } from "@shadryx/pptk/solid";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { SetStoreFunction } from "solid-js/store";
import { FontData, Glyph } from "../utils/FontData.js";
import UnicodeData from "../utils/UnicodeData.jsx";
import { getDrawArea } from "./drawArea.js";
import { draw, DrawData } from "./draw.js";
import EditorInfo from "./info.jsx";
import classes from "./style.module.css";
import EditorToolbar from "./toolbar.jsx";
import { EditorOperation, EditorTool } from "./types.js";

export type EditorProps = {
    fontData: FontData,
    setFontData: SetStoreFunction<FontData>,
}

export default function Editor(props: EditorProps) {
    const [operation, setOperation] = createSignal<EditorOperation>(EditorOperation.XOR);
    const [tool, setTool] = createSignal<EditorTool>(EditorTool.DRAW);
    const [currentGlyph, setCurrentGlyph] = createSignal(65);

    const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();
    const [touchElement, setTouchElement] = createSignal<HTMLElement>();

    const [center, setCenter] = createSignal<[cx: number, cy: number]>([0, 0]);

    const [pressedSet, setPressedSet] = createSignal(new Set<string>());

    // TODO: don't mutate pannable
    const pannable = usePannable({
        scale: 64,
        center,
        minScale: 1,
    });

    const drawArea = createMemo(() => {
        if (!canvas()) return undefined;

        return getDrawArea(
            props.fontData.glyphs.get(currentGlyph()) ?? props.fontData,
            pannable.getState(),
            canvas()!
        );
    });

    const drawData = createMemo((): DrawData | undefined => {
        if (!canvas() || !drawArea()) return undefined;

        return {
            currentGlyphIndex: currentGlyph(),
            fontData: props.fontData,
            drawArea: drawArea()!
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

    function isPanningTouch(touch: Touch) {
        return tool() === EditorTool.PAN || touch.type === "touch" || (touch.buttons & 4) > 0;
    }

    function panningTouches(touchMap: Map<number, Touch>): Map<number, Touch> {
        const res: Map<number, Touch> = new Map();

        for (const [index, touch] of touchMap.entries()) {
            // TODO: also accept middle mouse button
            if (isPanningTouch(touch)) {
                res.set(index, touch);
            }
        }

        return res;
    }

    function applyTouches(touchMap: Map<number, Touch>) {
        const transform = drawArea();
        if (!transform) return;

        let glyph = props.fontData.glyphs.get(currentGlyph())?.clone();
        if (!glyph) {
            glyph = new Glyph(props.fontData.width, props.fontData.height);
        }

        const alreadyPressed = new Set(pressedSet());

        let hasDrawingTouch = false;

        for (const touch of touchMap.values()) {
            if (isPanningTouch(touch)) continue;
            hasDrawingTouch = true;

            let [x, y] = transform.inverse(touch.x, touch.y);
            x = Math.floor(x);
            y = Math.floor(y);
            if (x < 0 || y < 0 || x >= glyph.width || y >= glyph.height || alreadyPressed.has(`${x}:${y}`)) {
                continue;
            }

            alreadyPressed.add(`${x}:${y}`);
            glyph.set(x, y, !glyph.get(x, y));
        }

        if (hasDrawingTouch) {
            setPressedSet(alreadyPressed);
            const newGlyphs = new Map(props.fontData.glyphs);
            newGlyphs.set(currentGlyph(), glyph);
            props.setFontData('glyphs', newGlyphs);
        } else if (alreadyPressed.size > 0) {
            setPressedSet(new Set<string>());
        }
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
        if (!canvas() || !drawData()) return;
        draw(canvas()!, props.fontData, drawData()!);
    });


    return <div class={classes.container}>
        <div class={classes.canvas}>
            <PixelPerfectTouch
                preventDefault={true}
                onDown={(_, touches) => {
                    pannable.update(panningTouches(touches));
                    applyTouches(touches);
                }}
                onUp={(_, touches) => {
                    pannable.update(panningTouches(touches));
                    applyTouches(touches);
                }}
                onMove={(_, touches) => {
                    pannable.move(panningTouches(touches));
                    applyTouches(touches);
                }}
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
                        draw(canvas()!, props.fontData, drawData()!);
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
