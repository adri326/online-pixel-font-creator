import { Path, Glyph as OTGlyph, Font as OTFont } from "opentype.js";
import { FontData, Glyph } from "../utils/FontData.js";

export const PIXEL_SIZE = 128;

// Note: glyphs are wound in the clockwise order for positive areas,
// and counter-clockwise order for negative areas (ie. holes)
export const Direction = Object.freeze({
    RIGHT: 0,
    TOP: 1,
    LEFT: 2,
    BOTTOM: 3
});
export type Direction = typeof Direction[keyof typeof Direction];

function generatePath(
    region: readonly boolean[],
    glyph: Required<Pick<Glyph, 'width' | 'height' | 'baseline' | 'leftOffset'>>,
    path: Path
) {
    const corners: [
        x: number,
        y: number,
        directionIn: Direction,
        directionOut: Direction,
        currentLoop?: number
    ][] = [];

    function getPixel(x: number, y: number) {
        if (x >= 0 && x < glyph.width && y >= 0 && y < glyph.height) {
            return region[x + y * glyph.width];
        } else return false;
    }

    // Sweep with a 2x2 window, finding corners
    for (let y = 0; y <= glyph.height + 1; y++) {
        for (let x = 0; x <= glyph.width + 1; x++) {
            const topLeft = getPixel(x - 1, y - 1);
            const topRight = getPixel(x, y - 1);
            const bottomLeft = getPixel(x - 1, y);
            const bottomRight = getPixel(x, y);

            const sum = Number(topLeft) + Number(topRight) + Number(bottomLeft) + Number(bottomRight);
            if (sum === 1 || sum === 3) {
                // If three or one neighbors are filled in, then mark a corner:
                // . .
                // →+
                // x↓.
                //
                // x x
                // ←+
                // .↑x
                const directionIn = [
                    bottomLeft && !topLeft,
                    bottomRight && !bottomLeft,
                    topRight && !bottomRight,
                    topLeft && !topRight
                ].indexOf(true) as Direction;

                const directionOut = [
                    bottomRight && !topRight,
                    topRight && !topLeft,
                    topLeft && !bottomLeft,
                    bottomLeft && !bottomRight
                ].indexOf(true) as Direction;

                corners.push([x, y, directionIn, directionOut]);
            } else if (topLeft === bottomRight && topRight === bottomLeft && topLeft !== topRight) {
                // Otherwise, if two tiles are in a diagonal to each other, then mark two corners:
                if (topLeft) {
                    // x .
                    //  +→
                    // .↑x
                    corners.push([x, y, Direction.BOTTOM, Direction.LEFT]);
                    // x↓.
                    // ←+
                    // . x
                    corners.push([x, y, Direction.TOP, Direction.RIGHT]);
                } else {
                    // .↑x
                    //  +←
                    // x .
                    corners.push([x, y, Direction.LEFT, Direction.TOP]);
                    // . x
                    // →+
                    // x↓.
                    corners.push([x, y, Direction.RIGHT, Direction.BOTTOM]);
                }
            }
        }
    }

    if (!corners.length) return;

    function getDirection(direction: Direction): [dx: number, dy: number] {
        if (direction === 0) return [1, 0];
        if (direction === 1) return [0, -1];
        if (direction === 2) return [-1, 0];
        else return [0, 1];
    }

    let loops: number[][] = [];

    function exploreLoop(n: number, loop: number): void {
        let loopComplete = false;

        while (!loopComplete) {
            let direction: Direction = corners[n][3];
            let [dx, dy] = getDirection(direction);
            let x = corners[n][0];
            let y = corners[n][1];
            while (x >= 0 && x <= glyph.width + 1 && y >= 0 && y <= glyph.height + 1) {
                x += dx;
                y += dy;

                const neighbor = corners.find(
                    (c) => c[0] === x && c[1] === y && c[2] === direction
                );
                if (neighbor) {
                    if (neighbor[4] !== undefined) {
                        loopComplete = true;
                        break;
                    }

                    n = corners.indexOf(neighbor);
                    neighbor[4] = loop;
                    loops[loop].push(n);
                    break;
                }
            }
        }
    }

    for (let n = 0; n < corners.length; n++) {
        if (corners[n][4] === undefined) {
            corners[n][4] = loops.length;
            loops.push([n]);
            exploreLoop(n, corners[n][4]!);
        }
    }

    function getOTFCoordinates(x: number, y: number): [x: number, y: number] {
        return [PIXEL_SIZE * (x - glyph.leftOffset), PIXEL_SIZE * -(y - glyph.baseline)];
    }

    for (let loop of loops) {
        loop.reverse();
        if (loop.length < 4) continue;
        path.moveTo(...getOTFCoordinates(corners[loop[0]][0], corners[loop[0]][1]));
        for (let n = 1; n < loop.length; n++) {
            path.lineTo(...getOTFCoordinates(corners[loop[n]][0], corners[loop[n]][1]));
        }
        path.lineTo(...getOTFCoordinates(corners[loop[0]][0], corners[loop[0]][1]));
    }
}

// Von neumann neighborhood
const VN_NEIGHBORHOOD = [[-1, 0], [0, -1], [1, 0], [0, 1]] as const;

export function generateTruetype(fontData: FontData, unicodeData: Map<number, string>): OTFont {
    let notdef_glyph = new OTGlyph({
        name: ".notdef",
        unicode: 0,
        advanceWidth: PIXEL_SIZE * (fontData.width + fontData.spacing),
        path: new Path()
    });

    let glyphs = [notdef_glyph];

    for (let [id, glyph] of fontData.glyphs) {
        let name = unicodeData.get(id);
        let path = new Path();
        let is_empty = true;
        let xMin = glyph.width;
        let xMax = 0;
        let yMin = glyph.height;
        let yMax = 0;
        const leftOffset = glyph.leftOffset ?? fontData.leftOffset;

        for (let y = 0; y < glyph.height; y++) {
            for (let x = 0; x < glyph.width; x++) {
                if (glyph.get(x, y)) {
                    is_empty = false;
                    xMin = Math.min(xMin, x);
                    xMax = Math.max(xMax, x);
                    yMin = Math.min(yMin, y);
                    yMax = Math.max(yMax, y);
                }
            }
        }

        generatePath(
            glyph.getPixels(),
            {
                width: glyph.width,
                height: glyph.height,
                baseline: glyph.baseline ?? fontData.baseline,
                leftOffset
            },
            path
        );

        if (!is_empty || id === 32) {
            glyphs.push(new OTGlyph({
                name,
                unicode: id,
                advanceWidth: PIXEL_SIZE * (glyph.width + fontData.spacing - leftOffset),
                path,
                leftSideBearing: Math.min(xMin - leftOffset, 0) * PIXEL_SIZE,
                // Looks like opentype.js discards this information anyway, so it might not be that useful to compute it
                xMin: (xMin - leftOffset) * PIXEL_SIZE,
                xMax: (xMax - leftOffset) * PIXEL_SIZE,
                // Note that min(-x) = -max(x)
                yMin: -(yMax - (glyph.baseline ?? fontData.baseline)) * PIXEL_SIZE,
                yMax: -(yMin - (glyph.baseline ?? fontData.baseline)) * PIXEL_SIZE,
            }));
        }
    }

    if (!glyphs.find((glyph) => glyph.index === 32)) {
        glyphs.push(new OTGlyph({
            name: unicodeData.get(32),
            unicode: 32,
            advanceWidth: PIXEL_SIZE * (fontData.width + fontData.spacing - fontData.leftOffset),
            path: new Path(),
            leftSideBearing: 0,
            xMin: 0,
            xMax: 0,
            yMin: 0,
            yMax: 0,
        }));
    }

    return new OTFont({
        familyName: fontData.name,
        styleName: fontData.style || "Medium",
        unitsPerEm: PIXEL_SIZE * fontData.emSize,
        ascender: PIXEL_SIZE * fontData.ascend,
        descender: PIXEL_SIZE * fontData.descend,
        glyphs,
    });
}
