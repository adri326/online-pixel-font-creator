const PREVIEW_MULT = 2;
const CURRENT_SIZE = 128;
const CURRENT_PADDING = 16;

const COLOR_PRIMARY_DARK = "#5E0B15"
const COLOR_PRIMARY_LIGHT = "#90323D"
const COLOR_ALT_DARK = "#BC8034"
const COLOR_ALT_LIGHT = "#CBA574"
const COLOR_GRAY_LIGHT = "#C5C9C7"
const COLOR_GRAY_MEDIUM = "#A0989F"
const COLOR_GRAY_DARK = "#7A6677"
const COLOR_BLACK = "#101010"
const COLOR_WHITE = "#f0f0f0"

const COLOR_BG = COLOR_GRAY_MEDIUM;
const COLOR_PIXEL_WHITE = COLOR_WHITE;
const COLOR_PIXEL_BLACK = "#212326";
const COLOR_GRID = "#403060";
const COLOR_CURRENT = COLOR_PRIMARY_LIGHT;
const COLOR_NEIGHBORS_BG = COLOR_GRAY_LIGHT;
const COLOR_NEIGHBORS_CURRENT_BG = COLOR_WHITE;
const COLOR_NEIGHBORS = COLOR_PRIMARY_DARK;
const COLOR_NEIGHBORS_TEXT = COLOR_PRIMARY_LIGHT;

function draw() {
    editor_ctx.fillStyle = COLOR_BG;
    editor_ctx.fillRect(0, 0, editor_canvas.width, editor_canvas.height);

    function editor_pos(x, y) {
        return [
            x * editor_status.pixel_size + editor_status.cx + (editor_canvas.width - font_data.width * editor_status.pixel_size) / 2,
            y * editor_status.pixel_size + editor_status.cy + (editor_canvas.height - font_data.height * editor_status.pixel_size) / 2
        ];
    }

    // Adds 0.5 to x and y to produce pixel-perfect lines
    function offset_half([x, y]) {
        return [Math.round(x) + 0.5, Math.round(y) + 0.5];
    }

    // Utility function for use with fillRect, that accepts a width/height pair instead of x2/y2
    function diff([x1, y1], [x2, y2]) {
        return [x2 - x1, y2 - y1];
    }

    function rect(x1, y1, x2, y2) {
        return editor_ctx.fillRect(
            ...offset_half(editor_pos(x1, y1)),
            ...diff(offset_half(editor_pos(x1, y1)), offset_half(editor_pos(x2, y2)))
        );
    }

    editor_ctx.fillStyle = COLOR_CURRENT;
    editor_ctx.font = CURRENT_SIZE + "px monospace";
    editor_ctx.textAlign = "center";
    editor_ctx.textBaseline = "middle";
    editor_ctx.fillText(to_utf16(editor_status.current_glyph), CURRENT_SIZE / 2 + CURRENT_PADDING, CURRENT_SIZE / 2 + CURRENT_PADDING);

    // Draw background
    editor_ctx.fillStyle = COLOR_PIXEL_WHITE;
    editor_ctx.shadowColor = COLOR_GRAY_DARK + "80";
    editor_ctx.shadowOffsetX = 0;
    editor_ctx.shadowOffsetY = editor_status.pixel_size * .25;
    editor_ctx.shadowBlur = editor_status.pixel_size * .75;
    rect(0, 0, font_data.width, font_data.height);
    editor_ctx.shadowColor = "transparent";

    let current_glyph = font_data.glyphs.get(editor_status.current_glyph);

    // Draw pixels
    if (current_glyph) {
        editor_ctx.fillStyle = COLOR_PIXEL_BLACK;
        for (let y = 0; y < font_data.height; y++) {
            for (let x = 0; x < font_data.width; x++) {
                if (current_glyph[y][x]) {
                    rect(x, y, x + 1, y + 1);
                }
            }
        }
    }

    // Draw grid
    editor_ctx.beginPath();
    for (let x = 0; x <= font_data.width; x++) {
        editor_ctx.moveTo(...offset_half(editor_pos(x, 0)));
        editor_ctx.lineTo(...offset_half(editor_pos(x, font_data.height)));
    }

    for (let y = 0; y <= font_data.height; y++) {
        editor_ctx.moveTo(...offset_half(editor_pos(0, y)));
        editor_ctx.lineTo(...offset_half(editor_pos(font_data.width, y)));
    }

    editor_ctx.lineWidth = 1;
    editor_ctx.strokeStyle = COLOR_GRID;
    editor_ctx.stroke();

    // Draw next and previous characters

    editor_ctx.fillStyle = COLOR_NEIGHBORS_BG;
    editor_ctx.fillRect(
        0,
        editor_canvas.height - (font_data.height + 2) * PREVIEW_MULT,
        editor_canvas.width,
        (font_data.height + 2) * PREVIEW_MULT
    );

    let n_chars = Math.floor(editor_canvas.width / (font_data.width + 2) / PREVIEW_MULT);

    editor_ctx.font = (font_data.height * PREVIEW_MULT * 0.75) + "px monospace";
    for (let n = 0; n < n_chars; n++) {
        let offset = n - Math.round(n_chars / 2);
        let x = (n * (font_data.width + 2) + 1) * PREVIEW_MULT;
        let y = editor_canvas.height - (font_data.height + 1) * PREVIEW_MULT;

        if (offset === 0) {
            editor_ctx.fillStyle = COLOR_NEIGHBORS_CURRENT_BG;
            editor_ctx.fillRect(
                x - PREVIEW_MULT,
                y - PREVIEW_MULT,
                (font_data.width + 2) * PREVIEW_MULT,
                (font_data.height + 2) * PREVIEW_MULT
            );
        }

        let current_glyph = font_data.glyphs.get(editor_status.current_glyph + offset);
        if (current_glyph) {
            editor_ctx.fillStyle = COLOR_NEIGHBORS;
            for (let dy = 0; dy < font_data.height; dy++) {
                for (let dx = 0; dx < font_data.width; dx++) {
                    if (!current_glyph[dy][dx]) continue;
                    editor_ctx.fillRect(
                        x + dx * PREVIEW_MULT,
                        y + dy * PREVIEW_MULT,
                        PREVIEW_MULT,
                        PREVIEW_MULT
                    );
                }
            }
        } else {
            editor_ctx.fillStyle = COLOR_NEIGHBORS_TEXT;
            editor_ctx.fillText(
                to_utf16(editor_status.current_glyph + offset),
                x + font_data.width * PREVIEW_MULT / 2,
                y + font_data.height * PREVIEW_MULT / 2 + PREVIEW_MULT
            );
        }
    }
}
