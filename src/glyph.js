export class Glyph {
    constructor(width, height) {
        this.data = new Array(width * height).fill(false);
        this.width = width;
        this.height = height;
    }

    get(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.data[x + y * this.width];
        }
    }

    set(x, y, value) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.data[x + y * this.width] = !!value;
        }
    }

    static from_pixels(pixels, width, height) {
        let res = new Glyph(width, height);
        pixels = pixels.slice(0, width * height);

        while (pixels.length < width * height) pixels.push(false);
        res.data = pixels;

        return res;
    }

    static clone(glyph) {
        let res = new Glyph(glyph.width, glyph.height);
        res.data = [...glyph.data];
        return res;
    }
}
