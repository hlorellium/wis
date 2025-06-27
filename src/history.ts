import type { State, Shape } from './state';

export interface Command {
    apply(state: State): void;   // execute (redo)
    invert(state: State): void;  // undo
}

export class AddShapeCommand implements Command {
    private shape: Shape;

    constructor(shape: Shape) {
        this.shape = shape;
    }

    apply(state: State): void {
        state.scene.shapes.push(this.shape);
    }

    invert(state: State): void {
        state.scene.shapes = state.scene.shapes.filter(sh => sh.id !== this.shape.id);
    }
}

export class RemoveShapeCommand implements Command {
    private shape: Shape;

    constructor(shape: Shape) {
        this.shape = shape;
    }

    apply(state: State): void {
        state.scene.shapes = state.scene.shapes.filter(sh => sh.id !== this.shape.id);
    }

    invert(state: State): void {
        state.scene.shapes.push(this.shape);
    }
}

export class PanCommand implements Command {
    private dx: number;
    private dy: number;

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
}

export class HistoryManager {
    private past: Command[] = [];
    private future: Command[] = [];

    push(command: Command, state: State): void {
        command.apply(state);
        this.past.push(command);
        this.future.length = 0; // clear redo chain
    }

    undo(state: State): boolean {
        const command = this.past.pop();
        if (command) {
            command.invert(state);
            this.future.push(command);
            return true;
        }
        return false;
    }

    redo(state: State): boolean {
        const command = this.future.pop();
        if (command) {
            command.apply(state);
            this.past.push(command);
            return true;
        }
        return false;
    }

    canUndo(): boolean {
        return this.past.length > 0;
    }

    canRedo(): boolean {
        return this.future.length > 0;
    }
}
