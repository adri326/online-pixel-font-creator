export const Corner = Object.freeze({
    TOP_LEFT: 0,
    TOP_RIGHT: 1,
    BOTTOM_LEFT: 2,
    BOTTOM_RIGHT: 3,
});
export type Corner = 0 | 1 | 2 | 3;

// TODO: move to a different file
export class Glyph {
    private pixels: boolean[];

    constructor(
        public readonly width: number,
        public readonly height: number,
        public readonly baseline?: number,
        public readonly leftOffset?: number,
        pixels = new Array(width * height).fill(false),
    ) {
        if (pixels.length != width * height) {
            throw new Error("Assertion error: expected pixels.length to be equal to width * height");
        }
        this.pixels = pixels;
    }

    dimensions(): [width: number, height: number] {
        return [this.width, this.height];
    }

    get(x: number, y: number) {
        if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        return this.pixels[x + y * this.width];
    }

    /** Sets the pixel at `x, y` to `value`.
     *
     * __mutates `this`!__
     **/
    set(x: number, y: number, value: boolean) {
        if (!Number.isInteger(x) || !Number.isInteger(y)) return;
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        this.pixels[x + y * this.width] = value;
    }

    getPixels(): boolean[] {
        return this.pixels;
    }

    setBaseline(baseline: number): Glyph {
        return new Glyph(this.width, this.height, baseline, this.leftOffset, this.pixels);
    }

    setLeftOffset(leftOffset: number): Glyph {
        return new Glyph(this.width, this.height, this.baseline, leftOffset, this.pixels);
    }

    /**
     * Returns a deep copy of this glyph, allowing for mutation of the glyph.
     **/
    clone(): Glyph {
        return new Glyph(this.width, this.height, this.baseline, this.leftOffset, this.pixels.slice());
    }

    resize(width: number, height: number, corner: Corner): Glyph {
        const result = new Glyph(width, height, this.baseline, this.leftOffset);
        const isTopCorner = corner === Corner.TOP_LEFT || corner === Corner.TOP_RIGHT;

        const left = corner === Corner.TOP_LEFT || corner === Corner.BOTTOM_LEFT ? width - this.width : 0;
        const top = isTopCorner ? height - this.height : 0;

        for (let y = 0; y < this.height; y++) {
            if (y + top < 0 || y + top >= height) continue;
            for (let x = 0; x < this.width; x++) {
                result.set(x + left, y + top, this.pixels[x + y * this.width]);
            }
        }

        return result;
    }

    resizeToFit(corner: Corner, horizontal: boolean, vertical: boolean): Glyph {
        let minX = this.width - 1;
        let maxX = 0;
        let minY = this.height - 1;
        let maxY = 0;

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.get(x, y)) {
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        const width = corner === Corner.BOTTOM_LEFT || corner === Corner.TOP_LEFT ? this.width - minX + 1 : maxX + 1;
        const height = corner === Corner.TOP_LEFT || corner === Corner.TOP_RIGHT ? this.height - minY + 1 : maxY + 1;

        return this.resize(horizontal ? width : this.width, vertical ? height : this.height, corner);
    }
}

export type FontData = {
    glyphs: Map<number, Glyph>;
    descend: number;
    ascend: number;
    width: number;
    height: number;
    baseline: number;
    spacing: number;
    emSize: number;
    leftOffset: number;

    name: string;
    author: string;
    style: string;
}
