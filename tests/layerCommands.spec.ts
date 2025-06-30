import { describe, it, expect, beforeEach } from 'vitest';
import { ChangeLayerCommand, LayerOperations } from '../src/commands/layerCommands';
import type { State, Shape } from '../src/state';
import { createRectangle } from './factories/shapeFactory';

describe('Layer Commands', () => {
    let state: State;
    let shapes: Shape[];

    beforeEach(() => {
        shapes = [
            createRectangle({ id: 'shape1', zIndex: 1, x: 10, y: 10, width: 50, height: 50 }),
            createRectangle({ id: 'shape2', zIndex: 2, x: 30, y: 30, width: 50, height: 50 }),
            createRectangle({ id: 'shape3', zIndex: 3, x: 50, y: 50, width: 50, height: 50 })
        ];

        state = {
            scene: { shapes },
            view: { panX: 0, panY: 0, zoom: 1 },
            tool: 'pan',
            currentColor: '#000000',
            fillMode: 'stroke',
            strokeColor: '#000000',
            fillColor: '#000000',
            strokeStyle: 'solid',
            strokeWidth: 2,
            currentDrawing: { shape: null, type: null },
            selection: [],
            currentEditing: {
                shapeId: null,
                vertexIndex: null,
                isDragging: false,
                isGroupMove: false,
                dragStart: null,
                previewShapes: null,
                originalShapes: null
            },
            ui: {
                selectionDrag: {
                    isActive: false,
                    start: null,
                    current: null
                }
            }
        };
    });

    describe('ChangeLayerCommand', () => {
        it('should apply layer changes correctly', () => {
            const updates = [
                { shapeId: 'shape1', oldZIndex: 1, newZIndex: 5 },
                { shapeId: 'shape2', oldZIndex: 2, newZIndex: 1 }
            ];

            const command = new ChangeLayerCommand(updates);
            command.apply(state);

            expect(state.scene.shapes[0].zIndex).toBe(5); // shape1
            expect(state.scene.shapes[1].zIndex).toBe(1); // shape2
            expect(state.scene.shapes[2].zIndex).toBe(3); // shape3 unchanged
        });

        it('should invert layer changes correctly', () => {
            const updates = [
                { shapeId: 'shape1', oldZIndex: 1, newZIndex: 5 },
                { shapeId: 'shape2', oldZIndex: 2, newZIndex: 1 }
            ];

            const command = new ChangeLayerCommand(updates);
            command.apply(state);
            command.invert(state);

            expect(state.scene.shapes[0].zIndex).toBe(1); // shape1 restored
            expect(state.scene.shapes[1].zIndex).toBe(2); // shape2 restored
            expect(state.scene.shapes[2].zIndex).toBe(3); // shape3 unchanged
        });

        it('should provide correct metadata', () => {
            const updates = [
                { shapeId: 'shape1', oldZIndex: 1, newZIndex: 5 },
                { shapeId: 'shape2', oldZIndex: 2, newZIndex: 1 }
            ];

            const command = new ChangeLayerCommand(updates);
            const metadata = command.getMetadata();

            expect(metadata.affectedShapeIds).toEqual(['shape1', 'shape2']);
            expect(metadata.sideEffects).toEqual([
                { type: 'cacheInvalidation', target: 'shape1' },
                { type: 'cacheInvalidation', target: 'shape2' },
                { type: 'rendering' },
                { type: 'persistence' }
            ]);
        });

        it('should serialize correctly', () => {
            const updates = [
                { shapeId: 'shape1', oldZIndex: 1, newZIndex: 5 }
            ];

            const command = new ChangeLayerCommand(updates, 'test-id');
            const serialized = command.serialize();

            expect(serialized.updates).toEqual(updates);
            expect(serialized.id).toBe('test-id');
            expect(serialized.timestamp).toBeTypeOf('number');
        });
    });

    describe('LayerOperations', () => {
        describe('getMaxZIndex', () => {
            it('should return the maximum zIndex', () => {
                expect(LayerOperations.getMaxZIndex(shapes)).toBe(3);
            });

            it('should return 0 for empty array', () => {
                expect(LayerOperations.getMaxZIndex([])).toBe(0);
            });
        });

        describe('getMinZIndex', () => {
            it('should return the minimum zIndex', () => {
                expect(LayerOperations.getMinZIndex(shapes)).toBe(1);
            });

            it('should return 0 for empty array', () => {
                expect(LayerOperations.getMinZIndex([])).toBe(0);
            });
        });

        describe('getNextZIndex', () => {
            it('should return max + 1', () => {
                expect(LayerOperations.getNextZIndex(shapes)).toBe(4);
            });

            it('should return 1 for empty array', () => {
                expect(LayerOperations.getNextZIndex([])).toBe(1);
            });
        });

        describe('bringToFront', () => {
            it('should bring single shape to front', () => {
                const command = LayerOperations.bringToFront(state, ['shape1']);
                
                expect(command).toBeTruthy();
                expect(command!.serialize().updates).toEqual([
                    { shapeId: 'shape1', oldZIndex: 1, newZIndex: 4 }
                ]);
            });

            it('should bring multiple shapes to front preserving order', () => {
                const command = LayerOperations.bringToFront(state, ['shape1', 'shape2']);
                
                expect(command).toBeTruthy();
                const updates = command!.serialize().updates;
                expect(updates).toEqual([
                    { shapeId: 'shape1', oldZIndex: 1, newZIndex: 4 },
                    { shapeId: 'shape2', oldZIndex: 2, newZIndex: 5 }
                ]);
            });

            it('should return null if no changes needed', () => {
                // Shape is already at max zIndex
                const command = LayerOperations.bringToFront(state, ['shape3']);
                expect(command).toBeNull();
            });

            it('should handle non-existent shapes gracefully', () => {
                const command = LayerOperations.bringToFront(state, ['nonexistent']);
                expect(command).toBeNull();
            });
        });

        describe('sendToBack', () => {
            it('should send single shape to back', () => {
                const command = LayerOperations.sendToBack(state, ['shape3']);
                
                expect(command).toBeTruthy();
                expect(command!.serialize().updates).toEqual([
                    { shapeId: 'shape3', oldZIndex: 3, newZIndex: 0 }
                ]);
            });

            it('should send multiple shapes to back preserving order', () => {
                const command = LayerOperations.sendToBack(state, ['shape2', 'shape3']);
                
                expect(command).toBeTruthy();
                const updates = command!.serialize().updates;
                expect(updates).toEqual([
                    { shapeId: 'shape2', oldZIndex: 2, newZIndex: -1 },
                    { shapeId: 'shape3', oldZIndex: 3, newZIndex: 0 }
                ]);
            });

            it('should return null if no changes needed', () => {
                // Shape is already at min zIndex
                const command = LayerOperations.sendToBack(state, ['shape1']);
                expect(command).toBeNull();
            });
        });

        describe('bringForward', () => {
            it('should bring shape forward one layer', () => {
                const command = LayerOperations.bringForward(state, ['shape1']);
                
                expect(command).toBeTruthy();
                const updates = command!.serialize().updates;
                expect(updates).toHaveLength(2);
                expect(updates).toContainEqual({ shapeId: 'shape1', oldZIndex: 1, newZIndex: 2 });
                expect(updates).toContainEqual({ shapeId: 'shape2', oldZIndex: 2, newZIndex: 1 });
            });

            it('should handle shape already at front', () => {
                const command = LayerOperations.bringForward(state, ['shape3']);
                expect(command).toBeNull();
            });

            it('should work with multiple shapes', () => {
                const command = LayerOperations.bringForward(state, ['shape1', 'shape2']);
                
                expect(command).toBeTruthy();
                const updates = command!.serialize().updates;
                // Should swap shape1 with shape2, and shape2 with shape3
                expect(updates).toHaveLength(4);
            });
        });

        describe('sendBackward', () => {
            it('should send shape backward one layer', () => {
                const command = LayerOperations.sendBackward(state, ['shape3']);
                
                expect(command).toBeTruthy();
                const updates = command!.serialize().updates;
                expect(updates).toHaveLength(2);
                expect(updates).toContainEqual({ shapeId: 'shape3', oldZIndex: 3, newZIndex: 2 });
                expect(updates).toContainEqual({ shapeId: 'shape2', oldZIndex: 2, newZIndex: 3 });
            });

            it('should handle shape already at back', () => {
                const command = LayerOperations.sendBackward(state, ['shape1']);
                expect(command).toBeNull();
            });

            it('should work with multiple shapes', () => {
                const command = LayerOperations.sendBackward(state, ['shape2', 'shape3']);
                
                expect(command).toBeTruthy();
                const updates = command!.serialize().updates;
                // Should swap shapes with lower layers
                expect(updates).toHaveLength(4);
            });
        });

        describe('edge cases', () => {
            it('should handle empty selection', () => {
                expect(LayerOperations.bringToFront(state, [])).toBeNull();
                expect(LayerOperations.sendToBack(state, [])).toBeNull();
                expect(LayerOperations.bringForward(state, [])).toBeNull();
                expect(LayerOperations.sendBackward(state, [])).toBeNull();
            });

            it('should handle single shape in scene', () => {
                state.scene.shapes = [shapes[0]];
                
                expect(LayerOperations.bringToFront(state, ['shape1'])).toBeNull();
                expect(LayerOperations.sendToBack(state, ['shape1'])).toBeNull();
                expect(LayerOperations.bringForward(state, ['shape1'])).toBeNull();
                expect(LayerOperations.sendBackward(state, ['shape1'])).toBeNull();
            });

            it('should maintain relative order within selection for bringToFront', () => {
                const command = LayerOperations.bringToFront(state, ['shape1', 'shape3']);
                
                expect(command).toBeTruthy();
                const updates = command!.serialize().updates;
                
                // shape1 should get zIndex 4, shape3 should get zIndex 5
                const shape1Update = updates.find(u => u.shapeId === 'shape1');
                const shape3Update = updates.find(u => u.shapeId === 'shape3');
                
                expect(shape1Update?.newZIndex).toBe(4);
                expect(shape3Update?.newZIndex).toBe(5);
            });

            it('should maintain relative order within selection for sendToBack', () => {
                const command = LayerOperations.sendToBack(state, ['shape1', 'shape3']);
                
                expect(command).toBeTruthy();
                const updates = command!.serialize().updates;
                
                // shape1 should get zIndex -1, shape3 should get zIndex 0
                const shape1Update = updates.find(u => u.shapeId === 'shape1');
                const shape3Update = updates.find(u => u.shapeId === 'shape3');
                
                expect(shape1Update?.newZIndex).toBe(-1);
                expect(shape3Update?.newZIndex).toBe(0);
            });
        });

        describe('complex scenarios', () => {
            it('should handle shapes with non-sequential zIndex values', () => {
                // Create shapes with gaps in zIndex
                state.scene.shapes = [
                    createRectangle({ id: 'shape1', zIndex: 1 }),
                    createRectangle({ id: 'shape2', zIndex: 5 }),
                    createRectangle({ id: 'shape3', zIndex: 10 })
                ];

                const command = LayerOperations.bringForward(state, ['shape1']);
                expect(command).toBeTruthy();
                
                const updates = command!.serialize().updates;
                expect(updates).toContainEqual({ shapeId: 'shape1', oldZIndex: 1, newZIndex: 5 });
                expect(updates).toContainEqual({ shapeId: 'shape2', oldZIndex: 5, newZIndex: 1 });
            });

            it('should handle negative zIndex values', () => {
                state.scene.shapes = [
                    createRectangle({ id: 'shape1', zIndex: -2 }),
                    createRectangle({ id: 'shape2', zIndex: 0 }),
                    createRectangle({ id: 'shape3', zIndex: 3 })
                ];

                expect(LayerOperations.getMinZIndex(state.scene.shapes)).toBe(-2);
                expect(LayerOperations.getMaxZIndex(state.scene.shapes)).toBe(3);
                expect(LayerOperations.getNextZIndex(state.scene.shapes)).toBe(4);

                const command = LayerOperations.sendToBack(state, ['shape3']);
                expect(command).toBeTruthy();
                
                const updates = command!.serialize().updates;
                expect(updates[0].newZIndex).toBe(-3); // Below current minimum
            });
        });
    });
});
