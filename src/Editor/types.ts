export const EditorOperation = {
    XOR: 0,
    ONE: 1,
    ZERO: 2,
    SELECT: 3,
    DESELECT: 4,
} as const;
export type EditorOperation = typeof EditorOperation[keyof typeof EditorOperation];

export const EditorTool = {
    DRAW: 0,
    PAN: 1,
    DRAG: 2,
} as const;
export type EditorTool = typeof EditorTool[keyof typeof EditorTool];
