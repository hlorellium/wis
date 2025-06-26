export type Rectangle = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type State = {
    scene: {
        rectangles: Rectangle[];
    },
    view: {
        panX: number;
        panY: number;
        zoom: number;
    }
};

export const initialState: State = {
    scene: {
        rectangles: [
            { x: 10, y: 10, width: 20, height: 20 },
            { x: 30, y: 30, width: 20, height: 20 },
            { x: 50, y: 50, width: 20, height: 20 },
            { x: 70, y: 70, width: 20, height: 20 },
        ]
    },
    view: {
        panX: 0, panY: 0,   // in CSS px
        zoom: 1,           // unitless, >0
    }

};
