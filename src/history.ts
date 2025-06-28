import type { State, Shape } from './state';
import { HISTORY_CONFIG } from './constants';

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

export class HistoryManager {
    private past: Command[] = [];
    private future: Command[] = [];
    private readonly maxSize: number;

    constructor(maxSize: number = HISTORY_CONFIG.MAX_STACK_SIZE) {
        this.maxSize = maxSize;
    }

    record(command: Command): void {
        // Record a command that has already been executed
        this.past.push(command);
        
        // Enforce capacity limit
        if (this.past.length > this.maxSize) {
            this.past.shift(); // remove oldest command
        }
        
        // Clear redo chain
        this.future.length = 0;
    }

    push(command: Command, state: State): void {
        // Try to merge with the last command if possible
        const lastCommand = this.past[this.past.length - 1];
        if (lastCommand?.merge) {
            const merged = lastCommand.merge(command);
            if (merged) {
                // Replace last command with merged one
                this.past[this.past.length - 1] = merged;
                // Revert last command and apply merged
                lastCommand.invert(state);
                merged.apply(state);
                this.future.length = 0; // clear redo chain
                return;
            }
        }

        // Apply the command
        command.apply(state);

        // Add to history
        this.past.push(command);

        // Enforce capacity limit
        if (this.past.length > this.maxSize) {
            this.past.shift(); // remove oldest command
        }

        // Clear redo chain
        this.future.length = 0;
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

    clear(): void {
        this.past.length = 0;
        this.future.length = 0;
    }

    getHistorySize(): { past: number; future: number } {
        return {
            past: this.past.length,
            future: this.future.length
        };
    }

    subscribeToHistory(callback: () => void) {
        callback();
    }
}
