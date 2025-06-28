import type { State, Shape } from '../state';

export interface Command {
    id: string;                  // unique command identifier
    timestamp: number;           // when the command was created
    apply(state: State): void;   // execute (redo)
    invert(state: State): void;  // undo
    merge?(other: Command): Command | null; // optional command merging
}

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

    serialize(): { shape: Shape; id: string; timestamp: number } {
        return { shape: this.shape, id: this.id, timestamp: this.timestamp };
    }
}

export class RemoveShapeCommand implements Command {
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
        state.scene.shapes = state.scene.shapes.filter(sh => sh.id !== this.shape.id);
    }

    invert(state: State): void {
        state.scene.shapes.push(this.shape);
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

    serialize(): { commandId: string; id: string; timestamp: number } {
        return { commandId: this.commandId, id: this.id, timestamp: this.timestamp };
    }
}
