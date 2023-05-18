import { Touch } from "@shadryx/pptk";
import { PixelPerfectCanvas, PixelPerfectTouch, usePannable } from "@shadryx/pptk/solid";
import { Accessor, createEffect, createMemo, createSignal, onCleanup, Setter } from "solid-js";
import { SetStoreFunction } from "solid-js/store";
import { FontData, Glyph } from "../utils/FontData.js";
import UnicodeData from "../utils/UnicodeData.jsx";
import { getDrawArea } from "./drawArea.js";
import { draw, DrawData } from "./draw.js";
import EditorInfo from "./info.jsx";
import classes from "./style.module.css";
import EditorToolbar from "./toolbar.jsx";
import { EditorOperation, EditorTool } from "./types.js";
import { appSettings } from "../settings/AppSettings.jsx";

export type EditorProps = {
    fontData: FontData,
    setFontData: SetStoreFunction<FontData>,
    currentGlyphIndex: Accessor<number>,
    setCurrentGlyphIndex: Setter<number>,
}

type Tap = {
    x: number,
    y: number,
    time: number,
}

export default function Editor(props: EditorProps) {
    const [operation, setOperation] = createSignal<EditorOperation>(EditorOperation.XOR);
    const [tool, setTool] = createSignal<EditorTool>(EditorTool.DRAW);
    const {currentGlyphIndex, setCurrentGlyphIndex} = props;

    const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();
    const [touchElement, setTouchElement] = createSignal<HTMLElement>();

    const [center, setCenter] = createSignal<[cx: number, cy: number]>([0, 0]);

    const [pressedSet, setPressedSet] = createSignal(new Set<string>());

    const pannable = usePannable({
        scale: 64,
        center,
        minScale: 1,
        round: true,
    });

    const [touchDates, setTouchDates] = createSignal<Map<number, number>>(new Map());
    const [taps, setTaps] = createSignal<Tap[]>([]);
    const [doubleTaps, setDoubleTaps] = createSignal<Set<number>>(new Set<number>());
    const [doubleTapTimeout, setDoubleTapTimeout] = createSignal<NodeJS.Timeout | undefined>(undefined);
    const [doubleTapMode, setDoubleTapMode] = createSignal<boolean>(false);

    const drawArea = createMemo(() => {
        if (!canvas()) return undefined;

        return getDrawArea(
            props.fontData.glyphs.get(currentGlyphIndex()) ?? props.fontData,
            pannable.getState(),
            canvas()!
        );
    });

    const drawData = createMemo((): DrawData | undefined => {
        if (!canvas() || !drawArea()) return undefined;

        return {
            currentGlyphIndex: currentGlyphIndex(),
            fontData: props.fontData,
            drawArea: drawArea()!,
            doubleTapMode: doubleTapMode(),
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
        if (doubleTaps().has(touch.id)) {
            return false;
        }
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

    function applyTool(oldState: boolean) {
        switch (operation()) {
            case EditorOperation.ONE:
                return true;
            case EditorOperation.ZERO:
                return false;
            case EditorOperation.XOR:
                return !oldState;
            default:
                // TODO: implement selection and other things
                return oldState;
        }
    }

    function applyTouches(touchMap: Map<number, Touch>) {
        const transform = drawArea();
        if (!transform) return;

        let glyph = props.fontData.glyphs.get(currentGlyphIndex())?.clone();
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
            glyph.set(x, y, applyTool(glyph.get(x, y)));
        }

        if (hasDrawingTouch) {
            setPressedSet(alreadyPressed);
            const newGlyphs = new Map(props.fontData.glyphs);
            newGlyphs.set(currentGlyphIndex(), glyph);
            props.setFontData("glyphs", newGlyphs);
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

    function isTap(touch: Touch) {
        if (Date.now() - (touchDates().get(touch.id) ?? 0) >= appSettings.doubleTapDelay) {
            return false;
        }
        const distance = (touch.x - touch.click_x) ** 2 + (touch.y - touch.click_y) ** 2;

        return distance < appSettings.doubleTapDistance ** 2;
    }

    function isDoubleTap(touch: Touch) {
        if (!isInDrawArea(touch.x, touch.y)) return false;

        const maxDistance = appSettings.doubleTapDistance ** 2;
        for (const tap of taps()) {
            if (Date.now() - tap.time >= appSettings.doubleTapDelay) {
                continue;
            }

            const distance = (touch.x - tap.x) ** 2 + (touch.y - tap.y) ** 2;

            if (distance < maxDistance) return true;
        }

        return false;
    }

    setInterval(() => {
        let newTaps = taps();
        let modified = false;
        const now = Date.now();

        newTaps = newTaps.filter(({time}) => {
            const keep = now - time < appSettings.doubleTapDelay;
            if (!keep) modified = true;
            return keep;
        });

        if (modified) setTaps(newTaps);
    }, 1000);


    function isInDrawArea(x: number, y: number) {
        const transform = drawArea();
        if (!transform) return;

        const inverse = transform.inverse(x, y);
        const width = props.fontData.glyphs.get(currentGlyphIndex())?.width ?? props.fontData.width;
        const height = props.fontData.glyphs.get(currentGlyphIndex())?.height ?? props.fontData.height;

        inverse[0] = Math.floor(inverse[0]);
        inverse[1] = Math.floor(inverse[1]);

        return inverse[0] >= 0 && inverse[0] < width && inverse[1] >= 0 && inverse[1] < height;
    }

    function handleTap(touch: Touch) {
        if (isInDrawArea(touch.x, touch.y)) return;

        const horizontalRatio = touch.x / canvas()!.width;
        if (horizontalRatio < appSettings.arrowArea) {
            setCurrentGlyphIndex((prev) => Math.max(prev - 1, 0));
        } else if (horizontalRatio > 1 - appSettings.arrowArea) {
            setCurrentGlyphIndex((prev) => prev + 1);
        }
    }

    return <div class={classes.container}>
        <div class={classes.canvas}>
            <PixelPerfectTouch
                preventDefault={true}
                onDown={(touch, touches) => {
                    canvas()!.focus();

                    const newTouchDates = new Map(touchDates());
                    newTouchDates.set(touch.id, Date.now());
                    setTouchDates(newTouchDates);

                    if (doubleTapMode() && isInDrawArea(touch.x, touch.y) || isDoubleTap(touch)) {
                        const newDoubleTaps = new Set(doubleTaps());
                        newDoubleTaps.add(touch.id);
                        setDoubleTaps(newDoubleTaps);
                        setDoubleTapMode(true);
                        setDoubleTapTimeout((prev) => {
                            if (prev !== undefined) clearTimeout(prev);
                            return undefined;
                        });
                    }

                    pannable.update(panningTouches(touches));
                    applyTouches(touches);
                }}
                onUp={(touch, touches) => {
                    if (touch) {
                        if (isTap(touch)) {
                            const newTaps = [...taps()];
                            newTaps.push({
                                x: touch.x,
                                y: touch.y,
                                time: Date.now()
                            });
                            setTaps(newTaps);

                            handleTap(touch);
                        }

                        if (doubleTaps().has(touch.id)) {
                            const newDoubleTaps = new Set(doubleTaps());
                            newDoubleTaps.delete(touch.id);
                            setDoubleTaps(newDoubleTaps);

                            if (newDoubleTaps.size == 0) {
                                setDoubleTapTimeout((prev) => {
                                    if (prev !== undefined) clearTimeout(prev);
                                    return setTimeout(() => {
                                        setDoubleTapMode(false);
                                    }, appSettings.doubleTapTimeout);
                                });
                            }
                        }
                    }

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
                        canvas.tabIndex = 0;
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
            setCurrentGlyph={setCurrentGlyphIndex}
        />
        <UnicodeData fallback={<i class={classes.info}>Loading unicode data...</i>}>
            <EditorInfo currentGlyph={currentGlyphIndex} />
        </UnicodeData>
    </div>;
}
