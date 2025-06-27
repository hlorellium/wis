export type Rectangle = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type Line = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
};

export type Circle = {
    x: number;
    y: number;
    radius: number;
};

export type Tool = 'pan' | 'line' | 'rectangle' | 'circle';

export type State = {
    scene: {
        rectangles: Rectangle[];
        lines: Line[];
        circles: Circle[];
    },
    view: {
        panX: number;
        panY: number;
        zoom: number;
    },
    tool: Tool;
    currentDrawing: {
        shape: Rectangle | Line | Circle | null;
        type: Tool | null;
    };
};

export const initialState: State = {
    scene: {
        rectangles: [
            { x: 10, y: 10, width: 20, height: 20 },
            { x: 30, y: 30, width: 20, height: 20 },
            { x: 50, y: 50, width: 20, height: 20 },
            { x: 70, y: 70, width: 20, height: 20 },
        ],
        lines: [],
        circles: []
    },
    view: {
        panX: 0, panY: 0,   // in CSS px
        zoom: 1,           // unitless, >0
    },
    tool: 'pan',
    currentDrawing: {
        shape: null,
        type: null
    }
};
