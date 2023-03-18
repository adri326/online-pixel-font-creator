import * as utils from "./utils.js";
import {font_data} from "./main.js";
import * as pptk from "https://cdn.skypack.dev/@shadryx/pptk@0.1.6?dts";

export const ZOOM_STRENGTH = 0.001;

export const preview_canvas = document.getElementById("preview-canvas");
pptk.attachCanvas(preview_canvas);
export const preview_ctx = preview_canvas.getContext("2d");
export const preview_prompt = document.getElementById("preview-prompt");

const _preview_status = new utils.ProxyListener({
    cx: 12,
    cy: 12,
    text: preview_prompt.value || "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG\nthe quick brown fox jumps over the lazy dog",

    logScale: 0,
    get pixel_size() {
        return Math.pow(2, Math.round(this.logScale * 2) / 2);
    }
});

export const preview_status = _preview_status.proxy;

function preview_draw_glyph(glyph, codepoint, x, y) {
    let fd = font_data();
    let pixel_size = preview_status.pixel_size;
    let sx = Math.round(preview_status.cx + (x - glyph.left_offset) * pixel_size);
    let sy = Math.round(preview_status.cy + (y * fd.height + fd.baseline - glyph.baseline) * pixel_size);

    // Very crude occlusion
    if (
        sx >= preview_canvas.width || sx + glyph.width * pixel_size < 0
        || sy >= preview_canvas.height || sy + glyph.height * pixel_size < 0
    ) return;

    preview_ctx.fillStyle = "black";
    for (let dy = 0; dy < glyph.height; dy++) {
        for (let dx = 0; dx < glyph.width; dx++) {
            if (!glyph.get(dx, dy)) continue;
            let x1 = Math.round(sx + dx * pixel_size);
            let y1 = Math.round(sy + dy * pixel_size);
            let x2 = Math.round(sx + (dx + 1) * pixel_size);
            let y2 = Math.round(sy + (dy + 1) * pixel_size);

            preview_ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
        }
    }
}

export function draw() {
    preview_ctx.clearRect(0, 0, preview_canvas.width, preview_canvas.height);
    let fd = font_data();

    let x = 0;
    let y = 0;

    for (let codepoint of utils.parse_utf16(preview_status.text)) {
        if (codepoint === 10) { // "\n"
            y++;
            x = 0;
            continue;
        }
        let glyph = fd.glyphs.get(codepoint);
        if (glyph) {
            preview_draw_glyph(glyph, codepoint, x, y);
            x += glyph.width + fd.spacing - glyph.left_offset;
        } else {
            x += fd.width + fd.spacing;
        }
    }
}

export function init() {
    preview_status.listen((target, property) => {
        if (property === "text" || property === "cx" || property === "cy" || property === "logScale") {
            utils.schedule_frame(draw);
        }
    });
    font_data().listen(() => utils.schedule_frame(draw));

    pptk.attachPannable(preview_canvas, {
        scrollSensitivity: ZOOM_STRENGTH,
        onUpdate(state) {
            preview_status.cx = state.dx;
            preview_status.cy = state.dy;
            preview_status.logScale = state.logScale;
        }
    });

    function preview_change() {
        if (preview_status.text !== preview_prompt.value) {
            preview_status.text = preview_prompt.value;
        }
    }

    preview_prompt.addEventListener("change", preview_change);
    preview_prompt.addEventListener("keyup", preview_change);
}
