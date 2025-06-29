import type { State, Shape, LineShape, RectangleShape, CircleShape, BezierCurveShape } from '../state';
import type { Command, CommandMetadata } from './index';

export class MoveVertexCommand implements Command {
    public readonly id: string;
    public readonly timestamp: number;
    private readonly shapeId: string;
    private readonly vertexIndex: number;
    private readonly oldPos: { x: number; y: number };
    private readonly newPos: { x: number; y: number };

    constructor(
        shapeId: string, 
        vertexIndex: number, 
        oldPos: { x: number; y: number }, 
        newPos: { x: number; y: number },
        id?: string
    ) {
        this.shapeId = shapeId;
        this.vertexIndex = vertexIndex;
        this.oldPos = { ...oldPos };
        this.newPos = { ...newPos };
        this.id = id || crypto.randomUUID();
        this.timestamp = Date.now();
    }

    apply(state: State): void {
        const shape = state.scene.shapes.find(s => s.id === this.shapeId);
        if (shape) {
            this.setVertexPosition(shape, this.vertexIndex, this.newPos);
        }
    }

    invert(state: State): void {
        const shape = state.scene.shapes.find(s => s.id === this.shapeId);
        if (shape) {
            this.setVertexPosition(shape, this.vertexIndex, this.oldPos);
        }
    }

    private setVertexPosition(shape: Shape, vertexIndex: number, pos: { x: number; y: number }): void {
        switch (shape.type) {
            case 'line':
                const lineShape = shape as LineShape;
                if (vertexIndex === 0) {
                    lineShape.x1 = pos.x;
                    lineShape.y1 = pos.y;
                } else if (vertexIndex === 1) {
                    lineShape.x2 = pos.x;
                    lineShape.y2 = pos.y;
                }
                break;

            case 'rectangle':
                const rectShape = shape as RectangleShape;
                // For rectangles, we support moving corners
                // vertexIndex: 0=top-left, 1=top-right, 2=bottom-right, 3=bottom-left
                if (vertexIndex === 0) {
                    // Top-left corner
                    const oldRight = rectShape.x + rectShape.width;
                    const oldBottom = rectShape.y + rectShape.height;
                    rectShape.x = pos.x;
                    rectShape.y = pos.y;
                    rectShape.width = oldRight - pos.x;
                    rectShape.height = oldBottom - pos.y;
                } else if (vertexIndex === 1) {
                    // Top-right corner
                    const oldBottom = rectShape.y + rectShape.height;
                    rectShape.y = pos.y;
                    rectShape.width = pos.x - rectShape.x;
                    rectShape.height = oldBottom - pos.y;
                } else if (vertexIndex === 2) {
                    // Bottom-right corner
                    rectShape.width = pos.x - rectShape.x;
                    rectShape.height = pos.y - rectShape.y;
                } else if (vertexIndex === 3) {
                    // Bottom-left corner
                    const oldRight = rectShape.x + rectShape.width;
                    rectShape.x = pos.x;
                    rectShape.width = oldRight - pos.x;
                    rectShape.height = pos.y - rectShape.y;
                }
                break;

            case 'circle':
                const circleShape = shape as CircleShape;
                // For all 4 handles (East, South, West, North), calculate distance from center and update radius
                const dx = pos.x - circleShape.x;
                const dy = pos.y - circleShape.y;
                circleShape.radius = Math.sqrt(dx * dx + dy * dy);
                break;

            case 'bezier':
                const bezierShape = shape as BezierCurveShape;
                if (vertexIndex >= 0 && vertexIndex < bezierShape.points.length) {
                    bezierShape.points[vertexIndex].x = pos.x;
                    bezierShape.points[vertexIndex].y = pos.y;
                }
                break;
        }
    }

    getMetadata(): CommandMetadata {
        return {
            affectedShapeIds: [this.shapeId],
            sideEffects: [
                { type: 'cacheInvalidation', target: this.shapeId },
                { type: 'rendering' },
                { type: 'persistence' }
            ]
        };
    }

    serialize(): { 
        shapeId: string; 
        vertexIndex: number; 
        oldPos: { x: number; y: number }; 
        newPos: { x: number; y: number }; 
        id: string; 
        timestamp: number 
    } {
        return { 
            shapeId: this.shapeId, 
            vertexIndex: this.vertexIndex, 
            oldPos: { ...this.oldPos }, 
            newPos: { ...this.newPos }, 
            id: this.id, 
            timestamp: this.timestamp 
        };
    }
}
