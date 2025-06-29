import type { State, Shape } from '../state';
import type { Command, CommandMetadata } from './index';
import type { SideEffect } from '../utils/eventBus';

export interface ShapePropertyUpdate {
    shapeId: string;
    oldProperties: Partial<Shape>;
    newProperties: Partial<Shape>;
}

export class UpdateShapePropertiesCommand implements Command {
    public readonly id: string;
    public readonly timestamp: number;
    private readonly updates: ShapePropertyUpdate[];

    constructor(updates: ShapePropertyUpdate[], id?: string) {
        this.updates = updates.map(update => ({
            ...update,
            // Clone properties to avoid reference issues
            oldProperties: JSON.parse(JSON.stringify(update.oldProperties)),
            newProperties: JSON.parse(JSON.stringify(update.newProperties))
        }));
        this.id = id || crypto.randomUUID();
        this.timestamp = Date.now();
    }

    apply(state: State): void {
        for (const update of this.updates) {
            const shape = state.scene.shapes.find(s => s.id === update.shapeId);
            if (shape) {
                Object.assign(shape, update.newProperties);
            }
        }
    }

    invert(state: State): void {
        for (const update of this.updates) {
            const shape = state.scene.shapes.find(s => s.id === update.shapeId);
            if (shape) {
                Object.assign(shape, update.oldProperties);
            }
        }
    }

    merge(other: Command): Command | null {
        if (other instanceof UpdateShapePropertiesCommand) {
            // Check if we're updating the same shapes
            const thisShapeIds = new Set(this.updates.map(u => u.shapeId));
            const otherShapeIds = new Set(other.updates.map(u => u.shapeId));
            
            // Only merge if affecting the same set of shapes
            if (thisShapeIds.size === otherShapeIds.size && 
                [...thisShapeIds].every(id => otherShapeIds.has(id))) {
                
                const mergedUpdates = this.updates.map(thisUpdate => {
                    const otherUpdate = other.updates.find(u => u.shapeId === thisUpdate.shapeId);
                    if (otherUpdate) {
                        return {
                            shapeId: thisUpdate.shapeId,
                            oldProperties: thisUpdate.oldProperties, // Keep original old values
                            newProperties: otherUpdate.newProperties // Use latest new values
                        };
                    }
                    return thisUpdate;
                });

                return new UpdateShapePropertiesCommand(mergedUpdates);
            }
        }
        return null;
    }

    getMetadata(): CommandMetadata {
        const affectedShapeIds = this.updates.map(u => u.shapeId);
        return {
            affectedShapeIds,
            sideEffects: [
                ...affectedShapeIds.map(id => ({ type: 'cacheInvalidation' as const, target: id })),
                { type: 'rendering' },
                { type: 'persistence' }
            ]
        };
    }

    serialize(): { updates: ShapePropertyUpdate[]; id: string; timestamp: number } {
        return { 
            updates: this.updates, 
            id: this.id, 
            timestamp: this.timestamp 
        };
    }
}
