import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HistoryManager } from '../src/history';
import { MoveShapesCommand, DeleteShapeCommand } from '../src/commands';
import type { State } from '../src/state';
import { initialState } from '../src/state';
import { eventBus } from '../src/utils/eventBus';

describe('Undo/Redo Selection Integration', () => {
    let history: HistoryManager;
    let state: State;
    let stateChangedSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        history = new HistoryManager();
        state = JSON.parse(JSON.stringify(initialState)); // Deep clone
        
        // Mock the eventBus
        stateChangedSpy = vi.fn();
        vi.spyOn(eventBus, 'emit').mockImplementation((eventType, data) => {
            if (eventType === 'stateChanged') {
                stateChangedSpy(data);
            }
        });
    });

    it('should preserve and restore selection state during undo/redo operations', () => {
        // Setup: Create a state with some shapes and selection
        const shape1 = { id: 'shape1', type: 'rectangle' as const, color: '#ff0000', x: 10, y: 10, width: 20, height: 20 };
        const shape2 = { id: 'shape2', type: 'rectangle' as const, color: '#00ff00', x: 50, y: 50, width: 30, height: 30 };
        
        state.scene.shapes = [shape1, shape2];
        state.selection = ['shape1', 'shape2']; // Both shapes selected
        
        // Action: Move the selected shapes
        const moveCommand = new MoveShapesCommand(['shape1', 'shape2'], 10, 20);
        history.push(moveCommand, state);
        
        // Verify the shapes moved and selection remains
        expect((state.scene.shapes[0] as any).x).toBe(20); // 10 + 10
        expect((state.scene.shapes[0] as any).y).toBe(30); // 10 + 20
        expect((state.scene.shapes[1] as any).x).toBe(60); // 50 + 10
        expect((state.scene.shapes[1] as any).y).toBe(70); // 50 + 20
        expect(state.selection).toEqual(['shape1', 'shape2']);
        
        // Action: Undo the move
        const undoResult = history.undo(state);
        
        // Verify: Shapes returned to original position AND selection preserved
        expect(undoResult).toBe(true);
        expect((state.scene.shapes[0] as any).x).toBe(10); // Back to original
        expect((state.scene.shapes[0] as any).y).toBe(10); // Back to original
        expect((state.scene.shapes[1] as any).x).toBe(50); // Back to original
        expect((state.scene.shapes[1] as any).y).toBe(50); // Back to original
        expect(state.selection).toEqual(['shape1', 'shape2']); // Selection preserved
        
        // Verify stateChanged event was emitted
        expect(stateChangedSpy).toHaveBeenCalledWith({ source: 'undo' });
        
        // Action: Redo the move
        const redoResult = history.redo(state);
        
        // Verify: Shapes moved again AND selection preserved
        expect(redoResult).toBe(true);
        expect((state.scene.shapes[0] as any).x).toBe(20); // Moved again
        expect((state.scene.shapes[0] as any).y).toBe(30); // Moved again
        expect((state.scene.shapes[1] as any).x).toBe(60); // Moved again
        expect((state.scene.shapes[1] as any).y).toBe(70); // Moved again
        expect(state.selection).toEqual(['shape1', 'shape2']); // Selection preserved
        
        // Verify stateChanged event was emitted for redo
        expect(stateChangedSpy).toHaveBeenCalledWith({ source: 'redo' });
    });

    it('should restore selection when undoing delete operations', () => {
        // Setup: Create a state with shapes, some selected
        const shape1 = { id: 'shape1', type: 'rectangle' as const, color: '#ff0000', x: 10, y: 10, width: 20, height: 20 };
        const shape2 = { id: 'shape2', type: 'rectangle' as const, color: '#00ff00', x: 50, y: 50, width: 30, height: 30 };
        const shape3 = { id: 'shape3', type: 'circle' as const, color: '#0000ff', x: 100, y: 100, radius: 15 };
        
        state.scene.shapes = [shape1, shape2, shape3];
        state.selection = ['shape2']; // Only shape2 selected
        
        // Action: Delete shape2 (which is selected)
        const deleteCommand = new DeleteShapeCommand(['shape2']);
        history.push(deleteCommand, state);
        
        // Verify: Shape2 is deleted and removed from selection
        expect(state.scene.shapes).toHaveLength(2);
        expect(state.scene.shapes.find(s => s.id === 'shape2')).toBeUndefined();
        expect(state.selection).toEqual([]); // Selection cleared
        
        // Action: Undo the delete
        const undoResult = history.undo(state);
        
        // Verify: Shape2 is restored AND selection is restored
        expect(undoResult).toBe(true);
        expect(state.scene.shapes).toHaveLength(3);
        expect(state.scene.shapes.find(s => s.id === 'shape2')).toBeDefined();
        expect(state.selection).toEqual(['shape2']); // Selection restored
        
        // Action: Redo the delete
        const redoResult = history.redo(state);
        
        // Verify: Shape2 is deleted again and selection cleared again
        expect(redoResult).toBe(true);
        expect(state.scene.shapes).toHaveLength(2);
        expect(state.scene.shapes.find(s => s.id === 'shape2')).toBeUndefined();
        expect(state.selection).toEqual([]); // Selection cleared again
    });

    it('should emit stateChanged events for both undo and redo operations', () => {
        // Setup: Simple move operation
        const shape = { id: 'shape1', type: 'rectangle' as const, color: '#ff0000', x: 10, y: 10, width: 20, height: 20 };
        state.scene.shapes = [shape];
        state.selection = ['shape1'];
        
        const moveCommand = new MoveShapesCommand(['shape1'], 5, 5);
        history.push(moveCommand, state);
        
        // Clear previous calls
        stateChangedSpy.mockClear();
        
        // Test undo
        history.undo(state);
        expect(stateChangedSpy).toHaveBeenCalledWith({ source: 'undo' });
        
        stateChangedSpy.mockClear();
        
        // Test redo
        history.redo(state);
        expect(stateChangedSpy).toHaveBeenCalledWith({ source: 'redo' });
    });
});
