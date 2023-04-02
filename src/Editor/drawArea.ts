import { PannableState } from "@shadryx/pptk";
import { Glyph } from "../utils/FontData.js";

export interface AffineTransformation {
    readonly scale: number;

    get(x: number, y: number): [x: number, y: number];
    /**
     * Should be the inverse operation of `this.get`, ie. `this.get(...this.inverse(x, y)) ~= [x, y]`
     **/
    inverse(x: number, y: number): [x: number, y: number];
}

export class ChainAffine<Transformations extends readonly AffineTransformation[]>
implements AffineTransformation {
    constructor(readonly transformations: Transformations) {}

    get(x: number, y: number): [x: number, y: number] {
        let resX = x;
        let resY = y;

        for (const transformation of this.transformations) {
            [resX, resY] = transformation.get(resX, resY);
        }

        return [resX, resY];
    }

    inverse(x: number, y: number): [x: number, y: number] {
        let resX = x;
        let resY = y;

        for (let n = this.transformations.length - 1; n >= 0; n--) {
            [resX, resY] = this.transformations[n].inverse(resX, resY);
        }

        return [resX, resY];
    }

    get scale() {
        return this.transformations.reduce((acc, act) => acc * act.scale, 1);
    }
}

class GlyphTransform implements AffineTransformation {
    readonly width: number;
    readonly height: number;

    readonly scale = 1;

    constructor(
        glyph: Pick<Glyph, 'width' | 'height'>
    ) {
        this.width = glyph.width;
        this.height = glyph.height;
    }

    get(x: number, y: number): [x: number, y: number] {
        return [x - this.width / 2, y - this.height / 2];
    }

    inverse(x: number, y: number): [x: number, y: number] {
        return [x + this.width / 2, y + this.height / 2];
    }
}

class AdaptCanvasScale implements AffineTransformation {
    readonly scale: number;

    constructor(
        canvas: HTMLCanvasElement
    ) {
        this.scale = Math.min(canvas.width, canvas.height) * window.devicePixelRatio / 1200;
    }

    get(x: number, y: number): [x: number, y: number] {
        return [x * this.scale, y * this.scale];
    }

    inverse(x: number, y: number): [x: number, y: number] {
        return [x / this.scale, y / this.scale];
    }
}

export function getDrawArea(
    glyph: Pick<Glyph, 'width' | 'height'>,
    pannableState: PannableState,
    canvas: HTMLCanvasElement,
) {
    return new ChainAffine([
        new GlyphTransform(glyph),
        new AdaptCanvasScale(canvas),
        pannableState,
    ] as const);
}
