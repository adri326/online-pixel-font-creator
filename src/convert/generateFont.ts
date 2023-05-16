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

export function generateTruetype(fontData: FontData, unicodeData: Map<number, string>) {
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
        let explored = new Array(glyph.width * glyph.height).fill(false);
        let is_empty = true;
        let min_x = glyph.width;
        let max_x = 0;
        let min_y = glyph.height;
        let max_y = 0;

        // Breadth-first search of an island of pixels
        function scanRegion(sx: number, sy: number) {
            const open: [x: number, y: number][] = [[sx, sy]];
            const res: boolean[] = new Array(glyph.width * glyph.height).fill(false);
            let current;

            while (current = open.pop()) {
                const [x, y] = current;
                res[x + y * glyph.width] = true;
                for (const [dx, dy] of VN_NEIGHBORHOOD) {
                    if (x + dx < 0 || x + dx >= glyph.width || y + dy < 0 || y + dy >= glyph.height) continue;
                    let index = x + dx + (y + dy) * glyph.width;
                    if (glyph.get(x + dx, y + dy) && !explored[index]) {
                        explored[index] = true;
                        open.push([x + dx, y + dy]);
                    }
                }
            }

            return res;
        }

        for (let y = 0; y < glyph.height; y++) {
            for (let x = 0; x < glyph.width; x++) {
                min_x = Math.min(min_x, x);
                max_x = Math.max(max_x, x);
                min_y = Math.min(min_y, y);
                max_y = Math.max(max_y, y);
                if (!explored[x + y * glyph.width] && glyph.get(x, y)) {
                    is_empty = false;
                    explored[x + y * glyph.width] = true;
                    // TODO: see if scanRegion can be safely removed
                    generatePath(
                        scanRegion(x, y),
                        {
                            width: glyph.width,
                            height: glyph.height,
                            baseline: glyph.baseline ?? fontData.baseline,
                            leftOffset: glyph.leftOffset ?? fontData.leftOffset
                        },
                        path
                    );
                } else {
                    explored[x + y * glyph.width] = true;
                }
            }
        }

        if (!is_empty) {
            glyphs.push(new OTGlyph({
                name,
                unicode: id,
                advanceWidth: PIXEL_SIZE * (glyph.width + fontData.spacing - (glyph.leftOffset ?? fontData.leftOffset)),
                path,
                leftSideBearing: Math.min(min_x - (glyph.leftOffset ?? fontData.leftOffset), 0) * PIXEL_SIZE,
            }));
        }
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
