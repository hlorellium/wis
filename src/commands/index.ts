import type { State, Shape } from '../state';

export interface Command {
    apply(state: State): void;   // execute (redo)
    invert(state: State): void;  // undo
    merge?(other: Command): Command | null; // optional command merging
}

export class AddShapeCommand implements Command {
    private readonly shape: Shape;

    constructor(shape: Shape) {
        // Clone the shape to remove any proxy wrappers that can't be serialized
        this.shape = JSON.parse(JSON.stringify(shape));
    }

    apply(state: State): void {
        state.scene.shapes.push(this.shape);
    }

    invert(state: State): void {
        state.scene.shapes = state.scene.shapes.filter(sh => sh.id !== this.shape.id);
    }

    serialize(): { shape: Shape } {
        return { shape: this.shape };
    }
}

export class RemoveShapeCommand implements Command {
    private readonly shape: Shape;

    constructor(shape: Shape) {
        // Clone the shape to remove any proxy wrappers that can't be serialized
        this.shape = JSON.parse(JSON.stringify(shape));
    }

    apply(state: State): void {
        state.scene.shapes = state.scene.shapes.filter(sh => sh.id !== this.shape.id);
    }

    invert(state: State): void {
        state.scene.shapes.push(this.shape);
    }

    serialize(): { shape: Shape } {
        return { shape: this.shape };
    }
}

export class PanCommand implements Command {
    private readonly dx: number;
    private readonly dy: number;

    constructor(dx: number, dy: number) {
        this.dx = dx;
        this.dy = dy;
    }

    apply(state: State): void {
        state.view.panX += this.dx;
        state.view.panY += this.dy;
    }

    invert(state: State): void {
        state.view.panX -= this.dx;
        state.view.panY -= this.dy;
    }

    merge(other: Command): Command | null {
        if (other instanceof PanCommand) {
            return new PanCommand(this.dx + other.dx, this.dy + other.dy);
        }
        return null;
    }

    serialize(): { dx: number; dy: number } {
        return { dx: this.dx, dy: this.dy };
    }
}
