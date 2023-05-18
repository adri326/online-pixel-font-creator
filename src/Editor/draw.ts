import { getContext2D, PixelPerfectContext2D } from "@shadryx/pptk";
import { appSettings } from "../settings/AppSettings.jsx";
import { UTF16FromCharCode } from "../utils.js";
import { FontData, Glyph } from "../utils/FontData.js";
import { AffineTransformation } from "./drawArea.js";


const COLOR_PRIMARY_DARK = "#5E0B15";
const COLOR_PRIMARY_LIGHT = "#90323D";
const COLOR_ALT_DARK = "#BC8034";
const COLOR_ALT_LIGHT = "#CBA574";
const COLOR_GRAY_LIGHT = "#C5C9C7";
const COLOR_GRAY_MEDIUM = "#A0989F";
const COLOR_GRAY_DARK = "#7A6677";
const COLOR_BLACK = "#101010";
const COLOR_WHITE = "#f0f0f0";
const COLOR_LIGHT_BLUE = "#e8e8f4";

const COLOR_BG = COLOR_GRAY_MEDIUM;
const COLOR_BG_ALT = "#8b7f84";
const COLOR_PIXEL_WHITE = COLOR_WHITE;
const COLOR_PIXEL_DOUBLE_TAP = COLOR_LIGHT_BLUE;
const COLOR_PIXEL_BLACK = "#212326";
const COLOR_GRID = "#403060";
const COLOR_CURRENT = COLOR_PRIMARY_LIGHT;
const COLOR_NEIGHBORS_BG = COLOR_GRAY_LIGHT;
const COLOR_NEIGHBORS_CURRENT_BG = COLOR_WHITE;
const COLOR_NEIGHBORS = COLOR_PRIMARY_LIGHT;
const COLOR_NEIGHBORS_TEXT = COLOR_GRAY_DARK;

export type DrawData = {
    currentGlyphIndex: number,
    fontData: FontData,
    drawArea: AffineTransformation,
    doubleTapMode: boolean,
};

export function draw(
    canvas: HTMLCanvasElement,
    fontData: FontData,
    drawData: DrawData
) {
    const ctx = canvas.getContext("2d")!;
    const ctx2 = getContext2D(canvas);
    if (!ctx) return;

    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let currentGlyph = fontData.glyphs.get(drawData.currentGlyphIndex);

    const width = currentGlyph?.width ?? fontData.width;
    const height = currentGlyph?.height ?? fontData.height;
    const pixelSize = drawData.drawArea.scale;

    function rect(x1: number, y1: number, x2: number, y2: number, margin = 0) {
        let [rx1, ry1] = drawData.drawArea.get(x1, y1);
        let [rx2, ry2] = drawData.drawArea.get(x2, y2);
        return ctx2.fillRect(
            rx1, ry1,
            rx2 - rx1, ry2 - ry1
        );
    }

    if (appSettings.arrowArea > 0) {
        drawArrows(ctx, canvas);
    }

    drawCurrentGlyph(ctx, drawData.currentGlyphIndex);

    // Draw background
    ctx.fillStyle = drawData.doubleTapMode ? COLOR_PIXEL_DOUBLE_TAP : COLOR_PIXEL_WHITE;
    if (pixelSize * Math.max(width, height) <= 640) {
        const opacity = 1 - Math.pow(pixelSize * Math.max(width, height) / 640, 3);
        ctx.shadowColor = COLOR_GRAY_DARK + Math.floor(opacity * 255).toString(16).padStart(2, "0");
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = pixelSize * .25;
        ctx.shadowBlur = pixelSize * .75;
        rect(0, 0, width, height);
        ctx.shadowColor = "transparent";
    } else {
        // Drop shadows are disabled when zooming in too much (or else it lags the browser)
        rect(0, 0, width, height);
    }


    // Draw pixels
    if (currentGlyph) {
        ctx.fillStyle = COLOR_PIXEL_BLACK;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (currentGlyph.get(x, y)) {
                    rect(x, y, x + 1, y + 1);
                }
                // Selection
                // if (drawData.pixels_selected.has(`${x},${y}`)) {
                //     ctx.fillStyle = COLOR_ALT_DARK;
                //     // TODO: put in a function :)
                //     // Sides
                //     if (!drawData.pixels_selected.has(`${x-1},${y}`)) rect(x, y, x + 0.25, y + 1);
                //     if (!drawData.pixels_selected.has(`${x},${y-1}`)) rect(x, y, x + 1, y + 0.25);
                //     if (!drawData.pixels_selected.has(`${x+1},${y}`)) rect(x + 0.75, y, x + 1, y + 1);
                //     if (!drawData.pixels_selected.has(`${x},${y+1}`)) rect(x, y + 0.75, x + 1, y + 1);
                //     // Corners
                //     if (!drawData.pixels_selected.has(`${x-1},${y-1}`)) rect(x, y, x + 0.25, y + 0.25);
                //     if (!drawData.pixels_selected.has(`${x+1},${y-1}`)) rect(x + 0.75, y, x + 1, y + 0.25);
                //     if (!drawData.pixels_selected.has(`${x+1},${y+1}`)) rect(x + 0.75, y + 0.75, x + 1, y + 1);
                //     if (!drawData.pixels_selected.has(`${x-1},${y+1}`)) rect(x, y + 0.75, x + 0.25, y + 1);
                //     ctx.fillStyle = COLOR_PIXEL_BLACK;
                // }
            }
        }
    }

    drawGrid(
        canvas,
        ctx2,
        fontData,
        drawData,
        currentGlyph
    );

    // Draw next and previous characters
    drawNeighboringGlyphs(
        canvas,
        ctx,
        fontData,
        drawData.currentGlyphIndex
    );
}

function drawGrid(
    canvas: HTMLCanvasElement,
    ctx: PixelPerfectContext2D,
    fontData: FontData,
    drawData: DrawData,
    currentGlyph: Glyph | undefined,
) {
    const baseline = currentGlyph?.baseline ?? fontData.baseline;
    const leftOffset = currentGlyph?.leftOffset ?? fontData.leftOffset;
    const width = currentGlyph?.width ?? fontData.width;
    const height = currentGlyph?.height ?? fontData.height;

    const drawArea = drawData.drawArea;
    const pixelSize = drawArea.scale;

    const [drawAreaLeft, drawAreaTop] = drawData.drawArea.get(0, 0);
    const [drawAreaRight, drawAreaBottom] = drawData.drawArea.get(width, height);
    const drawAreaWidth = drawAreaRight - drawAreaLeft;
    const drawAreaHeight = drawAreaBottom - drawAreaTop;


    function horizontalLine(y: number) {
        ctx.horizontalLine(...drawArea.get(0, y), drawAreaWidth);
    }

    function verticalLine(x: number) {
        ctx.verticalLine(...drawArea.get(x, 0), drawAreaHeight);
    }

    ctx.lineWidth = 1;
    ctx.strokeStyle = COLOR_GRID;

    // Draw grid
    for (let x = 0; x <= width; x++) {
        verticalLine(x);
    }

    for (let y = 0; y <= height; y++) {
        horizontalLine(y);
    }

    // Draw guides
    ctx.lineWidth = 3;
    ctx.strokeStyle = COLOR_GRID;
    horizontalLine(baseline - fontData.descend);
    horizontalLine(baseline - fontData.ascend);
    verticalLine(leftOffset + fontData.emSize);

    // Connect guides to the main grid if they extend past it
    ctx.lineWidth = 1;
    ctx.context.setLineDash([Math.round(pixelSize / 8), Math.round(pixelSize / 8)]);
    if (baseline - fontData.descend > height) {
        ctx.verticalLine(
            drawAreaLeft,
            drawAreaTop + drawAreaHeight,
            (baseline - fontData.descend) * pixelSize - drawAreaHeight
        );
        ctx.verticalLine(
            drawAreaLeft + drawAreaWidth,
            drawAreaTop + drawAreaHeight,
            (baseline - fontData.descend) * pixelSize - drawAreaHeight
        );
    }

    if (baseline - fontData.ascend < 0) {
        ctx.verticalLine(
            drawAreaLeft,
            drawAreaTop,
            (baseline - fontData.descend) * pixelSize
        );

        ctx.verticalLine(
            drawAreaLeft + drawAreaWidth,
            drawAreaTop,
            (baseline - fontData.descend) * pixelSize
        );
    }

    if (leftOffset + fontData.emSize > width) {
        ctx.horizontalLine(
            drawAreaLeft + drawAreaWidth,
            drawAreaTop,
            (leftOffset + fontData.emSize) * pixelSize - drawAreaWidth
        );
        ctx.horizontalLine(
            drawAreaLeft + drawAreaWidth,
            drawAreaTop + drawAreaHeight,
            (leftOffset + fontData.emSize) * pixelSize - drawAreaWidth
        );
    }
    ctx.context.setLineDash([]);

    // Draw baseline
    ctx.lineWidth = 3;
    ctx.strokeStyle = COLOR_ALT_LIGHT;
    if (fontData.descend === 0) {
        ctx.context.setLineDash([Math.round(pixelSize / 8), Math.round(pixelSize / 8)]);
    } else {
        ctx.context.setLineDash([]);
    }
    horizontalLine(baseline);
    ctx.context.setLineDash([]);

    // Draw left offset
    verticalLine(leftOffset);
}

// TODO: use a separate solids component for this
function drawNeighboringGlyphs(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    fontData: FontData,
    currentGlyphIndex: number
) {
    const pixelSize = Math.ceil(Math.max(window.devicePixelRatio * 1.5, 2));
    ctx.fillStyle = COLOR_NEIGHBORS_BG;
    ctx.fillRect(
        0,
        canvas.height - (fontData.height + 2) * pixelSize,
        canvas.width,
        (fontData.height + 2) * pixelSize
    );

    let n_chars = Math.floor(canvas.width / (fontData.width + 2) / pixelSize);

    ctx.font = (fontData.height * pixelSize * 0.75) + "px monospace";
    for (let n = 0; n < n_chars; n++) {
        let offset = n - Math.round(n_chars / 2);
        let x = (n * (fontData.width + 2) + 1) * pixelSize;
        let y = canvas.height - (fontData.height + 1) * pixelSize;

        if (offset === 0) {
            ctx.fillStyle = COLOR_NEIGHBORS_CURRENT_BG;
            ctx.fillRect(
                x - pixelSize,
                y - pixelSize,
                (fontData.width + 2) * pixelSize,
                (fontData.height + 2) * pixelSize
            );
        }

        if (currentGlyphIndex + offset < 0 || currentGlyphIndex + offset > 0x1FFFF) continue;

        let currentGlyph = fontData.glyphs.get(currentGlyphIndex + offset);
        let drewPixel = false;
        if (currentGlyph) {
            ctx.fillStyle = COLOR_NEIGHBORS;
            for (let dy = 0; dy < currentGlyph.height; dy++) {
                for (let dx = 0; dx < currentGlyph.width; dx++) {
                    if (!currentGlyph.get(dx, dy)) continue;
                    drewPixel = true;
                    ctx.fillRect(
                        x + dx * pixelSize,
                        y + fontData.baseline - (currentGlyph.baseline ?? fontData.baseline) + dy * pixelSize,
                        pixelSize,
                        pixelSize
                    );
                }
            }
        }
        if (!currentGlyph || !drewPixel) {
            ctx.fillStyle = COLOR_NEIGHBORS_TEXT;
            ctx.fillText(
                UTF16FromCharCode(currentGlyphIndex + offset),
                x + fontData.width * pixelSize / 2,
                y + fontData.height * pixelSize / 2 + pixelSize
            );
        }
    }
}

function drawCurrentGlyph(ctx: CanvasRenderingContext2D, currentGlyph: number) {
    const PADDING_LEFT = 0.15;
    const PADDING_TOP = 0.5;

    const fontSize = Math.ceil(128 * (window.devicePixelRatio ?? 1));

    ctx.fillStyle = COLOR_CURRENT;
    ctx.font = fontSize + "px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
        UTF16FromCharCode(currentGlyph),
        fontSize / 2 + fontSize * PADDING_LEFT,
        fontSize / 2 + fontSize * PADDING_TOP
    );
}

function drawArrows(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    ctx.fillStyle = COLOR_BG_ALT;
    ctx.fillRect(0, 0, canvas.width * appSettings.arrowArea, canvas.height);
    ctx.fillRect(canvas.width * (1 - appSettings.arrowArea), 0, canvas.width * appSettings.arrowArea, canvas.height);

    ctx.fillStyle = COLOR_GRAY_LIGHT;
    ctx.beginPath();
    ctx.moveTo(
        canvas.width * appSettings.arrowArea * 0.4,
        canvas.height * 0.5
    );
    ctx.lineTo(
        canvas.width * appSettings.arrowArea * 0.6,
        canvas.height * 0.5 - canvas.width * appSettings.arrowArea * 0.2
    );
    ctx.lineTo(
        canvas.width * appSettings.arrowArea * 0.6,
        canvas.height * 0.5 + canvas.width * appSettings.arrowArea * 0.2
    );
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(
        canvas.width * (1 - appSettings.arrowArea * 0.4),
        canvas.height * 0.5
    );
    ctx.lineTo(
        canvas.width * (1 - appSettings.arrowArea * 0.6),
        canvas.height * 0.5 - canvas.width * appSettings.arrowArea * 0.2
    );
    ctx.lineTo(
        canvas.width * (1 - appSettings.arrowArea * 0.6),
        canvas.height * 0.5 + canvas.width * appSettings.arrowArea * 0.2
    );
    ctx.fill();
}
