import { UTF16FromCharCode } from "../utils.js";
import { FontData } from "../utils/FontData.js";

const PREVIEW_MULT = 2;
const CURRENT_SIZE = 128;
const CURRENT_PADDING_LEFT = 16;
const CURRENT_PADDING_TOP = 64;

const COLOR_PRIMARY_DARK = "#5E0B15";
const COLOR_PRIMARY_LIGHT = "#90323D";
const COLOR_ALT_DARK = "#BC8034";
const COLOR_ALT_LIGHT = "#CBA574";
const COLOR_GRAY_LIGHT = "#C5C9C7";
const COLOR_GRAY_MEDIUM = "#A0989F";
const COLOR_GRAY_DARK = "#7A6677";
const COLOR_BLACK = "#101010";
const COLOR_WHITE = "#f0f0f0";

const COLOR_BG = COLOR_GRAY_MEDIUM;
const COLOR_PIXEL_WHITE = COLOR_WHITE;
const COLOR_PIXEL_BLACK = "#212326";
const COLOR_GRID = "#403060";
const COLOR_CURRENT = COLOR_PRIMARY_LIGHT;
const COLOR_NEIGHBORS_BG = COLOR_GRAY_LIGHT;
const COLOR_NEIGHBORS_CURRENT_BG = COLOR_WHITE;
const COLOR_NEIGHBORS = COLOR_PRIMARY_LIGHT;
const COLOR_NEIGHBORS_TEXT = COLOR_GRAY_DARK;

export type DrawData = {
    currentGlyph: number,
    cx: number,
    cy: number,
    scale: number,
};

export function draw(
    canvas: HTMLCanvasElement,
    fontData: FontData,
    drawData: DrawData
) {
    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;

    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let currentGlyph = fontData.glyphs.get(drawData.currentGlyph);

    const width = currentGlyph?.width ?? fontData.width;
    const height = currentGlyph?.height ?? fontData.height;
    const baseline = currentGlyph?.baseline ?? fontData.baseline;
    const leftOffset = currentGlyph?.leftOffset ?? fontData.leftOffset;
    const pixelSize = 16;

    function editorPos(x: number, y: number): [number, number] {
        return [
            x * pixelSize + drawData.cx + (canvas.width - width * pixelSize) / 2,
            y * pixelSize + drawData.cy + (canvas.height - height * pixelSize) / 2
        ];
    }

    // Adds 0.5 to x and y to produce pixel-perfect lines
    function offsetHalf([x, y]: [number, number], offset_x = true, offset_y = true): [number, number] {
        return [Math.round(x) + (offset_x ? 0.5 : 1), Math.round(y) + (offset_y ? 0.5 : 1)];
    }

    function round([x, y]: [number, number]): [number, number] {
        return [Math.round(x), Math.round(y)];
    }

    // Utility function for use with fillRect, that accepts a width/height pair instead of x2/y2
    function diff([x1, y1]: [number, number], [x2, y2]: [number, number]): [number, number] {
        return [x2 - x1, y2 - y1];
    }

    function rect(x1: number, y1: number, x2: number, y2: number, margin = 0) {
        let [rx1, ry1] = round(editorPos(x1, y1));
        let [rx2, ry2] = round(editorPos(x2, y2));
        return ctx.fillRect(
            rx1 + margin, ry1 + margin,
            rx2 - rx1 - margin * 2 + 1, ry2 - ry1 - margin * 2 + 1
        );
    }

    ctx.fillStyle = COLOR_CURRENT;
    ctx.font = CURRENT_SIZE + "px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(UTF16FromCharCode(drawData.currentGlyph), CURRENT_SIZE / 2 + CURRENT_PADDING_LEFT, CURRENT_SIZE / 2 + CURRENT_PADDING_TOP);

    // Draw background
    ctx.fillStyle = COLOR_PIXEL_WHITE;
    if (pixelSize * Math.max(width, height) <= 640) {
        ctx.shadowColor = COLOR_GRAY_DARK + "80";
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

    // Draw grid
    ctx.beginPath();
    for (let x = 0; x <= width; x++) {
        ctx.moveTo(...offsetHalf(editorPos(x, 0)));
        ctx.lineTo(...offsetHalf(editorPos(x, height)));
    }

    for (let y = 0; y <= height; y++) {
        ctx.moveTo(...offsetHalf(editorPos(0, y)));
        ctx.lineTo(...offsetHalf(editorPos(width, y)));
    }

    ctx.lineWidth = 1;
    ctx.strokeStyle = COLOR_GRID;
    ctx.stroke();

    // Draw guides

    ctx.beginPath();
    ctx.moveTo(...offsetHalf(editorPos(0, baseline - fontData.descend)));
    ctx.lineTo(...offsetHalf(editorPos(width, baseline - fontData.descend)));
    ctx.moveTo(...offsetHalf(editorPos(0, baseline - fontData.ascend)));
    ctx.lineTo(...offsetHalf(editorPos(width, baseline - fontData.ascend)));
    ctx.moveTo(...offsetHalf(editorPos(leftOffset + fontData.emSize, 0)));
    ctx.lineTo(...offsetHalf(editorPos(leftOffset + fontData.emSize, height)));

    ctx.lineWidth = 3;
    ctx.strokeStyle = COLOR_GRID;
    ctx.stroke();

    // Connect guides to the main grid if they extend past it
    ctx.beginPath();
    if (baseline - fontData.descend > height) {
        ctx.moveTo(...offsetHalf(editorPos(0, height)));
        ctx.lineTo(...offsetHalf(editorPos(0, baseline - fontData.descend)));

        ctx.moveTo(...offsetHalf(editorPos(width, height)));
        ctx.lineTo(...offsetHalf(editorPos(width, baseline - fontData.descend)));
    }

    if (baseline - fontData.ascend < 0) {
        ctx.moveTo(...offsetHalf(editorPos(0, 0)));
        ctx.lineTo(...offsetHalf(editorPos(0, baseline - fontData.ascend)));

        ctx.moveTo(...offsetHalf(editorPos(width, 0)));
        ctx.lineTo(...offsetHalf(editorPos(width, baseline - fontData.ascend)));
    }

    if (leftOffset + fontData.emSize > width) {
        ctx.moveTo(...offsetHalf(editorPos(width, 0)));
        ctx.lineTo(...offsetHalf(editorPos(leftOffset + fontData.emSize, 0)));

        ctx.moveTo(...offsetHalf(editorPos(width, height)));
        ctx.lineTo(...offsetHalf(editorPos(leftOffset + fontData.emSize, height)));
    }

    ctx.lineWidth = 1;
    ctx.setLineDash([Math.round(pixelSize / 8), Math.round(pixelSize / 8)]);
    ctx.stroke();

    // Draw baseline
    ctx.beginPath();
    ctx.moveTo(...offsetHalf(editorPos(0, baseline), false, true));
    ctx.lineTo(...offsetHalf(editorPos(width, baseline), false, true));

    ctx.lineWidth = 3;
    ctx.strokeStyle = COLOR_ALT_LIGHT;
    if (fontData.descend === 0) {
        ctx.setLineDash([Math.round(pixelSize / 8), Math.round(pixelSize / 8)]);
    } else {
        ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw left offset
    ctx.beginPath();
    ctx.moveTo(...offsetHalf(editorPos(leftOffset, 0), false, true));
    ctx.lineTo(...offsetHalf(editorPos(leftOffset, height), false, true));

    ctx.stroke();

    // Draw next and previous characters

    ctx.fillStyle = COLOR_NEIGHBORS_BG;
    ctx.fillRect(
        0,
        canvas.height - (fontData.height + 2) * PREVIEW_MULT,
        canvas.width,
        (fontData.height + 2) * PREVIEW_MULT
    );

    let n_chars = Math.floor(canvas.width / (fontData.width + 2) / PREVIEW_MULT);

    ctx.font = (fontData.height * PREVIEW_MULT * 0.75) + "px monospace";
    for (let n = 0; n < n_chars; n++) {
        let offset = n - Math.round(n_chars / 2);
        let x = (n * (fontData.width + 2) + 1) * PREVIEW_MULT;
        let y = canvas.height - (fontData.height + 1) * PREVIEW_MULT;

        if (offset === 0) {
            ctx.fillStyle = COLOR_NEIGHBORS_CURRENT_BG;
            ctx.fillRect(
                x - PREVIEW_MULT,
                y - PREVIEW_MULT,
                (fontData.width + 2) * PREVIEW_MULT,
                (fontData.height + 2) * PREVIEW_MULT
            );
        }

        if (drawData.currentGlyph + offset < 0 || drawData.currentGlyph + offset > 0x1FFFF) continue;

        let currentGlyph = fontData.glyphs.get(drawData.currentGlyph + offset);
        let drewPixel = false;
        if (currentGlyph) {
            ctx.fillStyle = COLOR_NEIGHBORS;
            for (let dy = 0; dy < currentGlyph.height; dy++) {
                for (let dx = 0; dx < currentGlyph.width; dx++) {
                    if (!currentGlyph.get(dx, dy)) continue;
                    drewPixel = true;
                    ctx.fillRect(
                        x + dx * PREVIEW_MULT,
                        y + fontData.baseline - (currentGlyph.baseline ?? fontData.baseline) + dy * PREVIEW_MULT,
                        PREVIEW_MULT,
                        PREVIEW_MULT
                    );
                }
            }
        }
        if (!currentGlyph || !drewPixel) {
            ctx.fillStyle = COLOR_NEIGHBORS_TEXT;
            ctx.fillText(
                UTF16FromCharCode(drawData.currentGlyph + offset),
                x + fontData.width * PREVIEW_MULT / 2,
                y + fontData.height * PREVIEW_MULT / 2 + PREVIEW_MULT
            );
        }
    }
}
