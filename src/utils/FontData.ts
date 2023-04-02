

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
