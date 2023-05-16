export const Corner = Object.freeze({
    TOP_LEFT: 0,
    TOP_RIGHT: 1,
    BOTTOM_LEFT: 2,
    BOTTOM_RIGHT: 3,
});
export type Corner = 0 | 1 | 2 | 3;

export class Glyph {
    public pixels: boolean[] = [];
    public baseline?: number;
    public leftOffset?: number;

    constructor(
        public width: number,
        public height: number,
    ) {
        this.pixels = new Array(width * height).fill(false);
    }

    dimensions(): [width: number, height: number] {
        return [this.width, this.height];
    }

    get(x: number, y: number) {
        if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        return this.pixels[x + y * this.width];
    }

    set(x: number, y: number, value: boolean) {
        if (!Number.isInteger(x) || !Number.isInteger(y)) return;
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        this.pixels[x + y * this.width] = value;
    }

    clone(): Glyph {
        const res = new Glyph(this.width, this.height);
        res.pixels = this.pixels.slice();
        res.baseline = this.baseline;
        res.leftOffset = this.leftOffset;

        return res;
    }

    resize(width: number, height: number, corner: Corner): Glyph {
        const result = new Glyph(width, height);
        const isTopCorner = corner === Corner.TOP_LEFT || corner === Corner.TOP_RIGHT;

        const left = corner === Corner.TOP_LEFT || corner === Corner.BOTTOM_LEFT ? width - this.width : 0;
        const top = isTopCorner ? height - this.height : 0;

        for (let y = 0; y < this.height; y++) {
            if (y + top < 0 || y + top >= height) continue;
            for (let x = 0; x < this.width; x++) {
                if (x + left < 0 || x + left >= width) continue;

                result.pixels[(x + left) + (y + top) * width] = this.pixels[x + y * this.width];
            }
        }

        result.baseline = this.baseline;
        result.leftOffset = this.leftOffset;

        return result;
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
