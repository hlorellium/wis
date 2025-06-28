import type { State, Shape } from '../state';
import type { Command } from './index';

export class DeleteShapeCommand implements Command {
    public readonly id: string;
    public readonly timestamp: number;
    private deletedShapes: Shape[] = [];
    private readonly shapeIds: string[];

    constructor(shapeIds: string[], id?: string) {
        this.shapeIds = [...shapeIds]; // Copy array
        this.id = id || crypto.randomUUID();
        this.timestamp = Date.now();
    }

    apply(state: State): void {
        // Store shapes that will be deleted for undo
        this.deletedShapes = state.scene.shapes.filter(shape => 
            this.shapeIds.includes(shape.id)
        ).map(shape => JSON.parse(JSON.stringify(shape))); // Clone to remove proxy wrappers

        // Remove shapes from scene
        state.scene.shapes = state.scene.shapes.filter(shape => 
            !this.shapeIds.includes(shape.id)
        );

        // Clear selection
        state.selection = [];
    }

    invert(state: State): void {
        // Restore deleted shapes
        state.scene.shapes.push(...this.deletedShapes);
        
        // Restore selection
        state.selection = this.shapeIds.slice();
    }

    serialize(): { shapeIds: string[]; deletedShapes: Shape[]; id: string; timestamp: number } {
        return {
            shapeIds: this.shapeIds,
            deletedShapes: this.deletedShapes,
            id: this.id,
            timestamp: this.timestamp
        };
    }
}
