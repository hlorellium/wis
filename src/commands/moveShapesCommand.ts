import type { State, Shape } from '../state';
import type { Command, CommandMetadata } from './index';

export class MoveShapesCommand implements Command {
    public readonly id: string;
    public readonly timestamp: number;
    private readonly shapeIds: string[];
    private readonly dx: number;
    private readonly dy: number;

    constructor(shapeIds: string[], dx: number, dy: number, id?: string) {
        this.shapeIds = [...shapeIds]; // Clone array
        this.dx = dx;
        this.dy = dy;
        this.id = id || crypto.randomUUID();
        this.timestamp = Date.now();
    }

    apply(state: State): void {
        state.scene.shapes.forEach(shape => {
            if (this.shapeIds.includes(shape.id)) {
                this.moveShape(shape, this.dx, this.dy);
            }
        });
    }

    invert(state: State): void {
        state.scene.shapes.forEach(shape => {
            if (this.shapeIds.includes(shape.id)) {
                this.moveShape(shape, -this.dx, -this.dy);
            }
        });
    }

    merge(other: Command): Command | null {
        if (other instanceof MoveShapesCommand) {
            // Only merge if moving the same set of shapes
            if (this.shapeIds.length === other.shapeIds.length &&
                this.shapeIds.every(id => other.shapeIds.includes(id))) {
                return new MoveShapesCommand(
                    this.shapeIds,
                    this.dx + other.dx,
                    this.dy + other.dy,
                    this.id // Keep original command ID
                );
            }
        }
        return null;
    }

    getMetadata(): CommandMetadata {
        return {
            affectedShapeIds: [...this.shapeIds],
            sideEffects: [
                ...this.shapeIds.map(shapeId => ({ type: 'cacheInvalidation' as const, target: shapeId })),
                { type: 'rendering' as const },
                { type: 'persistence' as const }
            ]
        };
    }

    private moveShape(shape: Shape, dx: number, dy: number): void {
        switch (shape.type) {
            case 'rectangle':
                shape.x += dx;
                shape.y += dy;
                break;
            case 'circle':
                shape.x += dx;
                shape.y += dy;
                break;
            case 'line':
                shape.x1 += dx;
                shape.y1 += dy;
                shape.x2 += dx;
                shape.y2 += dy;
                break;
            case 'bezier':
                shape.points.forEach(point => {
                    point.x += dx;
                    point.y += dy;
                });
                break;
        }
    }

    serialize(): { shapeIds: string[]; dx: number; dy: number; id: string; timestamp: number } {
        return { 
            shapeIds: [...this.shapeIds], 
            dx: this.dx, 
            dy: this.dy, 
            id: this.id, 
            timestamp: this.timestamp 
        };
    }
}
