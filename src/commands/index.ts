import type { State, Shape } from '../state';
import type { SideEffect } from '../utils/eventBus';

export interface CommandMetadata {
    affectedShapeIds: string[];
    sideEffects: SideEffect[];
}

export interface Command {
    id: string;                  // unique command identifier
    timestamp: number;           // when the command was created
    apply(state: State): void;   // execute (redo)
    invert(state: State): void;  // undo
    merge?(other: Command): Command | null; // optional command merging
    getMetadata(): CommandMetadata; // declare affected shapes and side effects
}

export { DeleteShapeCommand } from './deleteShapeCommand';
export { MoveShapesCommand } from './moveShapesCommand';
export { MoveVertexCommand } from './moveVertexCommand';
export { UpdateShapePropertiesCommand } from './updateShapePropertiesCommand';

export class AddShapeCommand implements Command {
    public readonly id: string;
    public readonly timestamp: number;
    private readonly shape: Shape;

    constructor(shape: Shape, id?: string) {
        // Clone the shape to remove any proxy wrappers that can't be serialized
        this.shape = JSON.parse(JSON.stringify(shape));
        this.id = id || crypto.randomUUID();
        this.timestamp = Date.now();
    }

    apply(state: State): void {
        state.scene.shapes.push(this.shape);
    }

    invert(state: State): void {
        state.scene.shapes = state.scene.shapes.filter(sh => sh.id !== this.shape.id);
    }

    getMetadata(): CommandMetadata {
        return {
            affectedShapeIds: [this.shape.id],
            sideEffects: [
                { type: 'cacheInvalidation', target: this.shape.id },
                { type: 'rendering' },
                { type: 'persistence' }
            ]
        };
    }

    serialize(): { shape: Shape; id: string; timestamp: number } {
        return { shape: this.shape, id: this.id, timestamp: this.timestamp };
    }
}

export class RemoveShapeCommand implements Command {
    public readonly id: string;
    public readonly timestamp: number;
    private readonly shape: Shape;
    private wasSelected: boolean = false;

    constructor(shape: Shape, id?: string) {
        // Clone the shape to remove any proxy wrappers that can't be serialized
        this.shape = JSON.parse(JSON.stringify(shape));
        this.id = id || crypto.randomUUID();
        this.timestamp = Date.now();
    }

    apply(state: State): void {
        // Remember if this shape was selected
        this.wasSelected = state.selection.includes(this.shape.id);
        
        // Remove shape from scene
        state.scene.shapes = state.scene.shapes.filter(sh => sh.id !== this.shape.id);
        
        // Remove from selection if it was selected
        if (this.wasSelected) {
            state.selection = state.selection.filter(id => id !== this.shape.id);
        }
    }

    invert(state: State): void {
        // Restore the shape
        state.scene.shapes.push(this.shape);
        
        // Restore selection if it was selected
        if (this.wasSelected) {
            state.selection.push(this.shape.id);
        }
    }

    getMetadata(): CommandMetadata {
        return {
            affectedShapeIds: [this.shape.id],
            sideEffects: [
                { type: 'cacheInvalidation', target: this.shape.id },
                { type: 'rendering' },
                { type: 'persistence' }
            ]
        };
    }

    serialize(): { shape: Shape; id: string; timestamp: number } {
        return { shape: this.shape, id: this.id, timestamp: this.timestamp };
    }
}

export class PanCommand implements Command {
    public readonly id: string;
    public readonly timestamp: number;
    private readonly dx: number;
    private readonly dy: number;

    constructor(dx: number, dy: number, id?: string) {
        this.dx = dx;
        this.dy = dy;
        this.id = id || crypto.randomUUID();
        this.timestamp = Date.now();
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
            // When merging, create a new command with a new ID but preserve the original timestamp
            return new PanCommand(this.dx + other.dx, this.dy + other.dy);
        }
        return null;
    }

    getMetadata(): CommandMetadata {
        return {
            affectedShapeIds: [], // Pan doesn't affect specific shapes
            sideEffects: [
                { type: 'rendering' } // Only needs a full re-render
            ]
        };
    }

    serialize(): { dx: number; dy: number; id: string; timestamp: number } {
        return { dx: this.dx, dy: this.dy, id: this.id, timestamp: this.timestamp };
    }
}

export class UndoCommand implements Command {
    public readonly id: string;
    public readonly timestamp: number;
    private readonly commandId: string;

    constructor(commandId: string, id?: string) {
        this.commandId = commandId;
        this.id = id || crypto.randomUUID();
        this.timestamp = Date.now();
    }

    apply(state: State): void {
        // The actual undo logic is handled by the HistoryManager
        // This command just signals that an undo operation occurred
    }

    invert(state: State): void {
        // Inverting an undo is a redo - also handled by HistoryManager
    }

    getCommandId(): string {
        return this.commandId;
    }

    getMetadata(): CommandMetadata {
        return {
            affectedShapeIds: [], // Undo affects whatever the original command affected
            sideEffects: [
                { type: 'rendering' },
                { type: 'persistence' }
            ]
        };
    }

    serialize(): { commandId: string; id: string; timestamp: number } {
        return { commandId: this.commandId, id: this.id, timestamp: this.timestamp };
    }
}

export class RedoCommand implements Command {
    public readonly id: string;
    public readonly timestamp: number;
    private readonly commandId: string;

    constructor(commandId: string, id?: string) {
        this.commandId = commandId;
        this.id = id || crypto.randomUUID();
        this.timestamp = Date.now();
    }

    apply(state: State): void {
        // The actual redo logic is handled by the HistoryManager
        // This command just signals that a redo operation occurred
    }

    invert(state: State): void {
        // Inverting a redo is an undo - also handled by HistoryManager
    }

    getCommandId(): string {
        return this.commandId;
    }

    getMetadata(): CommandMetadata {
        return {
            affectedShapeIds: [], // Redo affects whatever the original command affected
            sideEffects: [
                { type: 'rendering' },
                { type: 'persistence' }
            ]
        };
    }

    serialize(): { commandId: string; id: string; timestamp: number } {
        return { commandId: this.commandId, id: this.id, timestamp: this.timestamp };
    }
}
