import type { State, Shape } from '../state';
import type { Command, CommandMetadata } from './index';
import type { SideEffect } from '../utils/eventBus';

export interface LayerUpdate {
    shapeId: string;
    oldZIndex: number;
    newZIndex: number;
}

export class ChangeLayerCommand implements Command {
    public readonly id: string;
    public readonly timestamp: number;
    private readonly updates: LayerUpdate[];

    constructor(updates: LayerUpdate[], id?: string) {
        this.updates = updates;
        this.id = id || crypto.randomUUID();
        this.timestamp = Date.now();
    }

    apply(state: State): void {
        this.updates.forEach(update => {
            const shape = state.scene.shapes.find(s => s.id === update.shapeId);
            if (shape) {
                shape.zIndex = update.newZIndex;
            }
        });
    }

    invert(state: State): void {
        this.updates.forEach(update => {
            const shape = state.scene.shapes.find(s => s.id === update.shapeId);
            if (shape) {
                shape.zIndex = update.oldZIndex;
            }
        });
    }

    getMetadata(): CommandMetadata {
        return {
            affectedShapeIds: this.updates.map(u => u.shapeId),
            sideEffects: [
                ...this.updates.map(u => ({ type: 'cacheInvalidation' as const, target: u.shapeId })),
                { type: 'rendering' },
                { type: 'persistence' }
            ]
        };
    }

    serialize(): { updates: LayerUpdate[]; id: string; timestamp: number } {
        return { updates: this.updates, id: this.id, timestamp: this.timestamp };
    }
}

/**
 * Utility functions for layer operations
 */
export class LayerOperations {
    /**
     * Get the maximum zIndex currently in use
     */
    static getMaxZIndex(shapes: Shape[]): number {
        if (shapes.length === 0) return 0;
        return Math.max(...shapes.map(s => s.zIndex));
    }

    /**
     * Get the minimum zIndex currently in use
     */
    static getMinZIndex(shapes: Shape[]): number {
        if (shapes.length === 0) return 0;
        return Math.min(...shapes.map(s => s.zIndex));
    }

    /**
     * Get next available zIndex for new shapes
     */
    static getNextZIndex(shapes: Shape[]): number {
        return this.getMaxZIndex(shapes) + 1;
    }

    /**
     * Bring shapes to front - sets their zIndex to be higher than all other shapes
     */
    static bringToFront(state: State, shapeIds: string[]): ChangeLayerCommand | null {
        const shapes = state.scene.shapes;
        const maxZIndex = this.getMaxZIndex(shapes);
        const updates: LayerUpdate[] = [];

        // Check if any selected shape is not already at the front
        const selectedShapes = shapeIds
            .map(id => shapes.find(s => s.id === id))
            .filter((shape): shape is Shape => shape !== undefined);

        // If all selected shapes are already at max zIndex, no changes needed
        if (selectedShapes.every(shape => shape.zIndex === maxZIndex)) {
            return null;
        }

        shapeIds.forEach((shapeId, index) => {
            const shape = shapes.find(s => s.id === shapeId);
            if (shape) {
                const newZIndex = maxZIndex + index + 1;
                if (shape.zIndex !== newZIndex) {
                    updates.push({
                        shapeId,
                        oldZIndex: shape.zIndex,
                        newZIndex
                    });
                }
            }
        });

        return updates.length > 0 ? new ChangeLayerCommand(updates) : null;
    }

    /**
     * Send shapes to back - sets their zIndex to be lower than all other shapes
     */
    static sendToBack(state: State, shapeIds: string[]): ChangeLayerCommand | null {
        const shapes = state.scene.shapes;
        const minZIndex = this.getMinZIndex(shapes);
        const updates: LayerUpdate[] = [];

        // Check if any selected shape is not already at the back
        const selectedShapes = shapeIds
            .map(id => shapes.find(s => s.id === id))
            .filter((shape): shape is Shape => shape !== undefined);

        // If all selected shapes are already at min zIndex, no changes needed
        if (selectedShapes.every(shape => shape.zIndex === minZIndex)) {
            return null;
        }

        shapeIds.forEach((shapeId, index) => {
            const shape = shapes.find(s => s.id === shapeId);
            if (shape) {
                const newZIndex = minZIndex - shapeIds.length + index;
                if (shape.zIndex !== newZIndex) {
                    updates.push({
                        shapeId,
                        oldZIndex: shape.zIndex,
                        newZIndex
                    });
                }
            }
        });

        return updates.length > 0 ? new ChangeLayerCommand(updates) : null;
    }

    /**
     * Bring shapes forward one layer
     */
    static bringForward(state: State, shapeIds: string[]): ChangeLayerCommand | null {
        const shapes = state.scene.shapes;
        const updates: LayerUpdate[] = [];

        // Sort shapes by current zIndex to maintain relative order
        const selectedShapes = shapeIds
            .map(id => shapes.find(s => s.id === id))
            .filter((shape): shape is Shape => shape !== undefined)
            .sort((a, b) => a.zIndex - b.zIndex);

        selectedShapes.forEach(shape => {
            // Find the next higher zIndex that's not in our selection
            const higherShapes = shapes
                .filter(s => s.zIndex > shape.zIndex && !shapeIds.includes(s.id))
                .sort((a, b) => a.zIndex - b.zIndex);

            if (higherShapes.length > 0) {
                const targetZIndex = higherShapes[0].zIndex;
                updates.push({
                    shapeId: shape.id,
                    oldZIndex: shape.zIndex,
                    newZIndex: targetZIndex
                });

                // Move the target shape down
                updates.push({
                    shapeId: higherShapes[0].id,
                    oldZIndex: higherShapes[0].zIndex,
                    newZIndex: shape.zIndex
                });
            }
        });

        return updates.length > 0 ? new ChangeLayerCommand(updates) : null;
    }

    /**
     * Send shapes backward one layer
     */
    static sendBackward(state: State, shapeIds: string[]): ChangeLayerCommand | null {
        const shapes = state.scene.shapes;
        const updates: LayerUpdate[] = [];

        // Sort shapes by current zIndex in reverse to maintain relative order
        const selectedShapes = shapeIds
            .map(id => shapes.find(s => s.id === id))
            .filter((shape): shape is Shape => shape !== undefined)
            .sort((a, b) => b.zIndex - a.zIndex);

        selectedShapes.forEach(shape => {
            // Find the next lower zIndex that's not in our selection
            const lowerShapes = shapes
                .filter(s => s.zIndex < shape.zIndex && !shapeIds.includes(s.id))
                .sort((a, b) => b.zIndex - a.zIndex);

            if (lowerShapes.length > 0) {
                const targetZIndex = lowerShapes[0].zIndex;
                updates.push({
                    shapeId: shape.id,
                    oldZIndex: shape.zIndex,
                    newZIndex: targetZIndex
                });

                // Move the target shape up
                updates.push({
                    shapeId: lowerShapes[0].id,
                    oldZIndex: lowerShapes[0].zIndex,
                    newZIndex: shape.zIndex
                });
            }
        });

        return updates.length > 0 ? new ChangeLayerCommand(updates) : null;
    }
}
