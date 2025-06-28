import { describe, it, expect, beforeEach } from 'vitest';
import { SelectionManager } from '../src/utils/selectionManager';
import type { State } from '../src/state';
import { initialState } from '../src/state';

describe('SelectionManager', () => {
    let state: State;

    beforeEach(() => {
        // Create a fresh state for each test
        state = JSON.parse(JSON.stringify(initialState));
    });

    describe('clear()', () => {
        it('should clear selection and return correct flags when selection exists', () => {
            // Setup: have some shapes selected
            state.selection = ['shape1', 'shape2'];
            state.tool = 'select';

            const result = SelectionManager.clear(state);

            expect(state.selection).toEqual([]);
            expect(state.tool).toBe('select');
            expect(result.wasInEditMode).toBe(false);
            expect(result.selectionCleared).toBe(true);
        });

        it('should clear selection and switch from edit to select mode', () => {
            // Setup: in edit mode with selection
            state.selection = ['shape1'];
            state.tool = 'edit';

            const result = SelectionManager.clear(state);

            expect(state.selection).toEqual([]);
            expect(state.tool).toBe('select');
            expect(result.wasInEditMode).toBe(true);
            expect(result.selectionCleared).toBe(true);
        });

        it('should handle clearing when no selection exists', () => {
            // Setup: no selection
            state.selection = [];
            state.tool = 'select';

            const result = SelectionManager.clear(state);

            expect(state.selection).toEqual([]);
            expect(state.tool).toBe('select');
            expect(result.wasInEditMode).toBe(false);
            expect(result.selectionCleared).toBe(false);
        });

        it('should switch from edit to select even when no selection exists', () => {
            // Setup: edit mode but no selection
            state.selection = [];
            state.tool = 'edit';

            const result = SelectionManager.clear(state);

            expect(state.selection).toEqual([]);
            expect(state.tool).toBe('select');
            expect(result.wasInEditMode).toBe(true);
            expect(result.selectionCleared).toBe(false);
        });

        it('should not affect other tools', () => {
            // Setup: different tool with selection
            state.selection = ['shape1'];
            state.tool = 'rectangle';

            const result = SelectionManager.clear(state);

            expect(state.selection).toEqual([]);
            expect(state.tool).toBe('rectangle'); // Should not change
            expect(result.wasInEditMode).toBe(false);
            expect(result.selectionCleared).toBe(true);
        });
    });

    describe('setSelection()', () => {
        it('should set selection to provided shape IDs', () => {
            state.selection = ['old1', 'old2'];

            SelectionManager.setSelection(state, ['new1', 'new2', 'new3']);

            expect(state.selection).toEqual(['new1', 'new2', 'new3']);
        });

        it('should replace existing selection completely', () => {
            state.selection = ['shape1', 'shape2'];

            SelectionManager.setSelection(state, ['shape3']);

            expect(state.selection).toEqual(['shape3']);
        });

        it('should handle empty array', () => {
            state.selection = ['shape1', 'shape2'];

            SelectionManager.setSelection(state, []);

            expect(state.selection).toEqual([]);
        });

        it('should create a new array (not mutate input)', () => {
            const input = ['shape1', 'shape2'];
            
            SelectionManager.setSelection(state, input);
            
            // Modify the original input array
            input.push('shape3');
            
            // State should not be affected
            expect(state.selection).toEqual(['shape1', 'shape2']);
        });
    });

    describe('addToSelection()', () => {
        it('should add new shape IDs to existing selection', () => {
            state.selection = ['shape1'];

            SelectionManager.addToSelection(state, ['shape2', 'shape3']);

            expect(state.selection).toEqual(['shape1', 'shape2', 'shape3']);
        });

        it('should not add duplicate shape IDs', () => {
            state.selection = ['shape1', 'shape2'];

            SelectionManager.addToSelection(state, ['shape2', 'shape3']);

            expect(state.selection).toEqual(['shape1', 'shape2', 'shape3']);
        });

        it('should handle adding to empty selection', () => {
            state.selection = [];

            SelectionManager.addToSelection(state, ['shape1', 'shape2']);

            expect(state.selection).toEqual(['shape1', 'shape2']);
        });

        it('should handle empty input array', () => {
            state.selection = ['shape1'];

            SelectionManager.addToSelection(state, []);

            expect(state.selection).toEqual(['shape1']);
        });

        it('should handle all duplicates', () => {
            state.selection = ['shape1', 'shape2'];

            SelectionManager.addToSelection(state, ['shape1', 'shape2']);

            expect(state.selection).toEqual(['shape1', 'shape2']);
        });
    });

    describe('removeFromSelection()', () => {
        it('should remove specified shape IDs from selection', () => {
            state.selection = ['shape1', 'shape2', 'shape3'];

            SelectionManager.removeFromSelection(state, ['shape2']);

            expect(state.selection).toEqual(['shape1', 'shape3']);
        });

        it('should remove multiple shape IDs', () => {
            state.selection = ['shape1', 'shape2', 'shape3', 'shape4'];

            SelectionManager.removeFromSelection(state, ['shape2', 'shape4']);

            expect(state.selection).toEqual(['shape1', 'shape3']);
        });

        it('should handle removing non-existent IDs gracefully', () => {
            state.selection = ['shape1', 'shape2'];

            SelectionManager.removeFromSelection(state, ['shape3', 'shape4']);

            expect(state.selection).toEqual(['shape1', 'shape2']);
        });

        it('should handle empty input array', () => {
            state.selection = ['shape1', 'shape2'];

            SelectionManager.removeFromSelection(state, []);

            expect(state.selection).toEqual(['shape1', 'shape2']);
        });

        it('should handle removing from empty selection', () => {
            state.selection = [];

            SelectionManager.removeFromSelection(state, ['shape1']);

            expect(state.selection).toEqual([]);
        });
    });

    describe('hasSelection()', () => {
        it('should return true when shapes are selected', () => {
            state.selection = ['shape1'];

            expect(SelectionManager.hasSelection(state)).toBe(true);
        });

        it('should return false when no shapes are selected', () => {
            state.selection = [];

            expect(SelectionManager.hasSelection(state)).toBe(false);
        });

        it('should return true for multiple selected shapes', () => {
            state.selection = ['shape1', 'shape2', 'shape3'];

            expect(SelectionManager.hasSelection(state)).toBe(true);
        });
    });

    describe('isSelected()', () => {
        beforeEach(() => {
            state.selection = ['shape1', 'shape3', 'shape5'];
        });

        it('should return true for selected shape', () => {
            expect(SelectionManager.isSelected(state, 'shape1')).toBe(true);
            expect(SelectionManager.isSelected(state, 'shape3')).toBe(true);
            expect(SelectionManager.isSelected(state, 'shape5')).toBe(true);
        });

        it('should return false for non-selected shape', () => {
            expect(SelectionManager.isSelected(state, 'shape2')).toBe(false);
            expect(SelectionManager.isSelected(state, 'shape4')).toBe(false);
            expect(SelectionManager.isSelected(state, 'nonexistent')).toBe(false);
        });

        it('should return false when no selection exists', () => {
            state.selection = [];

            expect(SelectionManager.isSelected(state, 'shape1')).toBe(false);
        });
    });

    describe('integration scenarios', () => {
        it('should handle typical select-edit-clear workflow', () => {
            // Start with no selection
            expect(SelectionManager.hasSelection(state)).toBe(false);

            // Select a shape
            SelectionManager.setSelection(state, ['shape1']);
            expect(SelectionManager.hasSelection(state)).toBe(true);
            expect(SelectionManager.isSelected(state, 'shape1')).toBe(true);

            // Switch to edit mode (simulated)
            state.tool = 'edit';

            // Clear selection (should switch back to select mode)
            const result = SelectionManager.clear(state);
            expect(result.wasInEditMode).toBe(true);
            expect(result.selectionCleared).toBe(true);
            expect(state.tool).toBe('select');
            expect(SelectionManager.hasSelection(state)).toBe(false);
        });

        it('should handle multi-select operations', () => {
            // Start with one selection
            SelectionManager.setSelection(state, ['shape1']);

            // Add more shapes
            SelectionManager.addToSelection(state, ['shape2', 'shape3']);
            expect(state.selection).toEqual(['shape1', 'shape2', 'shape3']);

            // Remove one shape
            SelectionManager.removeFromSelection(state, ['shape2']);
            expect(state.selection).toEqual(['shape1', 'shape3']);

            // Clear all
            SelectionManager.clear(state);
            expect(state.selection).toEqual([]);
        });
    });
});
