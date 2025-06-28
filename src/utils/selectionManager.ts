import type { State } from '../state';

/**
 * Centralized selection management utilities to ensure consistent
 * behavior across tools when clearing/manipulating selections.
 */
export class SelectionManager {
    /**
     * Clears the current selection and automatically switches back to 'select' mode
     * if currently in 'edit' mode. This ensures consistent behavior across the app.
     */
    static clear(state: State): { wasInEditMode: boolean; selectionCleared: boolean } {
        const wasInEditMode = state.tool === 'edit';
        const hadSelection = state.selection.length > 0;
        
        // Clear the selection
        state.selection = [];
        
        // If we were in edit mode, switch back to select mode
        if (wasInEditMode) {
            state.tool = 'select';
        }
        
        return {
            wasInEditMode,
            selectionCleared: hadSelection
        };
    }
    
    /**
     * Sets the selection to the given shape IDs.
     * Useful for single-click selection or programmatic selection changes.
     */
    static setSelection(state: State, shapeIds: string[]): void {
        state.selection = [...shapeIds];
    }
    
    /**
     * Adds shape IDs to the current selection (for multi-select operations).
     */
    static addToSelection(state: State, shapeIds: string[]): void {
        const newIds = shapeIds.filter(id => !state.selection.includes(id));
        state.selection.push(...newIds);
    }
    
    /**
     * Removes shape IDs from the current selection.
     */
    static removeFromSelection(state: State, shapeIds: string[]): void {
        state.selection = state.selection.filter(id => !shapeIds.includes(id));
    }
    
    /**
     * Checks if any shapes are currently selected.
     */
    static hasSelection(state: State): boolean {
        return state.selection.length > 0;
    }
    
    /**
     * Checks if a specific shape is selected.
     */
    static isSelected(state: State, shapeId: string): boolean {
        return state.selection.includes(shapeId);
    }
}
