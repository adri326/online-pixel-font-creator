import * as utils from "./utils.js";
import {font_data} from "./main.js";

export const ZOOM_STRENGTH = 0.001;

export const preview_canvas = document.getElementById("preview-canvas");
export const preview_ctx = preview_canvas.getContext("2d");
export const preview_prompt = document.getElementById("preview-prompt");

const _preview_status = new utils.ProxyListener({
    cx: 12,
    old_cx: 12,
    cy: 12,
    old_cy: 12,
    text: preview_prompt.value || "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG\nthe quick brown fox jumps over the lazy dog",

    mouse_x: 0,
    mouse_y: 0,
    mouse_down: false,
    hovered: false,

    zoom: 0,
    get pixel_size() {
        return Math.pow(2, Math.round(this.zoom * 2) / 2);
    }
});

export const preview_status = _preview_status.proxy;

function preview_draw_glyph(glyph, codepoint, x, y) {
    let fd = font_data();
    let pixel_size = preview_status.pixel_size;
    let sx = Math.round(preview_status.cx + x * (fd.width + fd.spacing) * pixel_size);
    let sy = Math.round(preview_status.cy + y * fd.height * pixel_size);

    // Very crude occlusion
    if (
        sx >= preview_canvas.width || sx + fd.width * pixel_size < 0
        || sy >= preview_canvas.height || sy + fd.height * pixel_size < 0
    ) return;

    preview_ctx.fillStyle = "black";
    for (let dy = 0; dy < fd.height; dy++) {
        for (let dx = 0; dx < fd.width; dx++) {
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
        }
        x++;
    }
}

export function init() {
    preview_status.listen((target, property) => {
        if (property === "text" || property === "cx" || property === "cy" || property === "zoom") {
            utils.schedule_frame(draw);
        }
    });
    font_data().listen(() => utils.schedule_frame(draw));

    preview_canvas.addEventListener("wheel", (event) => {
        if (preview_status.zoom - event.deltaY * ZOOM_STRENGTH >= 0) {
            preview_status.cx /= Math.pow(2, event.deltaY * ZOOM_STRENGTH);
            preview_status.old_cx = preview_status.cx;
            preview_status.cy /= Math.pow(2, event.deltaY * ZOOM_STRENGTH);
            preview_status.old_cy = preview_status.cy;
            preview_status.zoom -= event.deltaY * ZOOM_STRENGTH;
        } else {
            preview_status.cx /= Math.pow(2, -preview_status.zoom);
            preview_status.old_cx = preview_status.cx;
            preview_status.cy /= Math.pow(2, -preview_status.zoom);
            preview_status.old_cy = preview_status.cy;
            preview_status.zoom = 0;
        }
    });

    preview_canvas.addEventListener("mousedown", (event) => {
        preview_status.mouse_x = event.clientX;
        preview_status.mouse_y = event.clientY;
        preview_status.mouse_down = true;
    });

    preview_canvas.addEventListener("mouseup", (event) => {
        preview_status.mouse_down = false;
        preview_status.old_cx = preview_status.cx;
        preview_status.old_cy = preview_status.cy;
    });

    preview_canvas.addEventListener("mousemove", (event) => {
        if (preview_status.mouse_down) {
            preview_status.cx = preview_status.old_cx + event.clientX - preview_status.mouse_x;
            preview_status.cy = preview_status.old_cy + event.clientY - preview_status.mouse_y;

            draw();
        }
    });

    preview_canvas.addEventListener("mouseover", (event) => {
        preview_status.hovered = true;
    });

    preview_canvas.addEventListener("mouseleave", (event) => {
        preview_status.hovered = false;
        preview_status.mouse_down = false;
    });

    function preview_change() {
        if (preview_status.text !== preview_prompt.value) {
            preview_status.text = preview_prompt.value;
        }
    }

    preview_prompt.addEventListener("change", preview_change);
    preview_prompt.addEventListener("keyup", preview_change);
}
