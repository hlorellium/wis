import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MouseHandler } from '../src/input/mouse';
import { ToolManager } from '../src/tools/toolManager';
import { CommandExecutor } from '../src/commandExecutor';
import { HistoryManager } from '../src/history';
import { SelectionManager } from '../src/utils/selectionManager';
import type { State } from '../src/state';
import { initialState } from '../src/state';
import { Path2DRenderer } from '../src/rendering/path2DRenderer';

describe('MouseFlow Integration Tests', () => {
    let canvas: HTMLCanvasElement;
    let state: State;
    let toolManager: ToolManager;
    let executor: CommandExecutor;
    let history: HistoryManager;
    let renderer: Path2DRenderer;
    let mouseHandler: MouseHandler;
    let mockForceRender: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        // Create canvas mock
        canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        
        // Mock getBoundingClientRect
        vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
            left: 0,
            top: 0,
            width: 800,
            height: 600,
            right: 800,
            bottom: 600,
            x: 0,
            y: 0,
            toJSON: () => ({})
        });

        // Create fresh state
        state = JSON.parse(JSON.stringify(initialState));
        state.tool = 'select'; // Start in select mode
        
        // Create instances
        executor = new CommandExecutor();
        history = new HistoryManager();
        renderer = new Path2DRenderer();
        
        // Mock DOM elements that ToolManager expects
        document.body.innerHTML = `
            <div>
                <button class="tool-btn" data-tool="select">Select</button>
                <button class="tool-btn" data-tool="edit">Edit</button>
                <button data-action="undo">Undo</button>
                <button data-action="redo">Redo</button>
            </div>
        `;
        
        toolManager = new ToolManager(canvas, executor, history);
        mouseHandler = new MouseHandler(canvas, toolManager, executor, renderer);
        
        // Mock force render callback
        mockForceRender = vi.fn();
        mouseHandler.setForceRenderCallback(mockForceRender);
        
        // Setup event listeners
        mouseHandler.setupEventListeners(canvas, state);
    });

    const createMouseEvent = (type: string, x: number, y: number, detail = 1): MouseEvent => {
        return new MouseEvent(type, {
            clientX: x,
            clientY: y,
            button: 0,
            detail,
            bubbles: true,
            cancelable: true
        });
    };

    describe('Basic Selection Flow', () => {
        it('should select shape on single click', () => {
            expect(SelectionManager.hasSelection(state)).toBe(false);
            
            // Click on first shape (at 10,10 with size 20x20, so center is 20,20)
            const clickEvent = createMouseEvent('mousedown', 20, 20);
            canvas.dispatchEvent(clickEvent);
            
            expect(SelectionManager.hasSelection(state)).toBe(true);
            expect(state.selection).toHaveLength(1);
            expect(state.selection[0]).toBe(state.scene.shapes[0].id);
        });

        it('should clear selection on empty space click', () => {
            // First select a shape
            SelectionManager.setSelection(state, [state.scene.shapes[0].id]);
            expect(SelectionManager.hasSelection(state)).toBe(true);
            
            // Click on empty space (far from any shapes)
            const clickEvent = createMouseEvent('mousedown', 200, 200);
            canvas.dispatchEvent(clickEvent);
            
            // Simulate mouse up to complete the interaction
            window.dispatchEvent(new MouseEvent('mouseup'));
            
            expect(SelectionManager.hasSelection(state)).toBe(false);
        });

        it('should perform drag selection (left-to-right window selection)', () => {
            expect(SelectionManager.hasSelection(state)).toBe(false);
            
            // Start drag from top-left of shapes area
            const startEvent = createMouseEvent('mousedown', 5, 5);
            canvas.dispatchEvent(startEvent);
            
            // Drag to encompass first two shapes (which are at 10,10 and 30,30)
            const moveEvent = createMouseEvent('mousemove', 55, 55);
            window.dispatchEvent(moveEvent);
            
            // End drag
            window.dispatchEvent(new MouseEvent('mouseup'));
            
            expect(SelectionManager.hasSelection(state)).toBe(true);
            expect(state.selection.length).toBeGreaterThan(0);
        });
    });

    describe('Edit Mode Transitions', () => {
        it('should switch to edit mode on double-click of selected shape', () => {
            // First select a shape
            SelectionManager.setSelection(state, [state.scene.shapes[0].id]);
            expect(state.tool).toBe('select');
            
            // Double-click on the selected shape
            const dblClickEvent = createMouseEvent('dblclick', 20, 20, 2);
            canvas.dispatchEvent(dblClickEvent);
            
            expect(state.tool).toBe('edit');
        });

        it('should clear selection and return to select mode when clicking empty space in edit mode', () => {
            // Setup: in edit mode with selection
            SelectionManager.setSelection(state, [state.scene.shapes[0].id]);
            state.tool = 'edit';
            
            expect(SelectionManager.hasSelection(state)).toBe(true);
            expect(state.tool).toBe('edit');
            
            // Click on empty space in edit mode
            const clickEvent = createMouseEvent('mousedown', 200, 200);
            canvas.dispatchEvent(clickEvent);
            
            expect(SelectionManager.hasSelection(state)).toBe(false);
            expect(state.tool).toBe('select');
        });

        it('should auto-switch back to select mode when selection is cleared in edit mode', () => {
            // Setup: in edit mode with selection
            SelectionManager.setSelection(state, [state.scene.shapes[0].id]);
            state.tool = 'edit';
            
            // Mock ToolManager.setActiveTool
            const setActiveToolSpy = vi.spyOn(toolManager, 'setActiveTool');
            
            // Click on empty space (this will be handled by SelectTool in edit mode)
            const clickEvent = createMouseEvent('mousedown', 200, 200);
            canvas.dispatchEvent(clickEvent);
            
            // Verify the tool was switched back to select
            expect(setActiveToolSpy).toHaveBeenCalledWith('select', state);
        });
    });

    describe('Drag Selection in Different Modes', () => {
        it('should enable drag selection after returning from edit mode', () => {
            // Start in edit mode with selection
            SelectionManager.setSelection(state, [state.scene.shapes[0].id]);
            state.tool = 'edit';
            
            // Click empty space to clear and return to select mode
            const clearClickEvent = createMouseEvent('mousedown', 200, 200);
            canvas.dispatchEvent(clearClickEvent);
            
            expect(state.tool).toBe('select');
            expect(SelectionManager.hasSelection(state)).toBe(false);
            
            // Now try drag selection - should work
            const dragStartEvent = createMouseEvent('mousedown', 5, 5);
            canvas.dispatchEvent(dragStartEvent);
            
            const dragMoveEvent = createMouseEvent('mousemove', 35, 35);
            window.dispatchEvent(dragMoveEvent);
            
            window.dispatchEvent(new MouseEvent('mouseup'));
            
            // Should have selected shapes via drag
            expect(SelectionManager.hasSelection(state)).toBe(true);
        });

        it('should not perform drag selection in edit mode', () => {
            // Setup: in edit mode with selection
            SelectionManager.setSelection(state, [state.scene.shapes[0].id]);
            state.tool = 'edit';
            
            // Try to drag in empty area while in edit mode
            const dragStartEvent = createMouseEvent('mousedown', 100, 100);
            canvas.dispatchEvent(dragStartEvent);
            
            const dragMoveEvent = createMouseEvent('mousemove', 150, 150);
            window.dispatchEvent(dragMoveEvent);
            
            window.dispatchEvent(new MouseEvent('mouseup'));
            
            // Selection should be cleared (not performing selection)
            expect(SelectionManager.hasSelection(state)).toBe(false);
            expect(state.tool).toBe('select'); // And should have switched back
        });
    });

    describe('Keyboard Interactions', () => {
        it('should delete selected shapes on Delete key', () => {
            // Select a shape
            SelectionManager.setSelection(state, [state.scene.shapes[0].id]);
            const initialShapeCount = state.scene.shapes.length;
            
            // Press Delete key
            const deleteEvent = new KeyboardEvent('keydown', {
                key: 'Delete',
                bubbles: true,
                cancelable: true
            });
            
            window.dispatchEvent(deleteEvent);
            
            // Shape should be removed from scene
            expect(state.scene.shapes.length).toBe(initialShapeCount - 1);
            expect(SelectionManager.hasSelection(state)).toBe(false);
        });

        it('should delete selected shapes on Backspace key', () => {
            // Select a shape
            SelectionManager.setSelection(state, [state.scene.shapes[0].id]);
            const initialShapeCount = state.scene.shapes.length;
            
            // Press Backspace key
            const backspaceEvent = new KeyboardEvent('keydown', {
                key: 'Backspace',
                bubbles: true,
                cancelable: true
            });
            
            window.dispatchEvent(backspaceEvent);
            
            // Shape should be removed from scene
            expect(state.scene.shapes.length).toBe(initialShapeCount - 1);
            expect(SelectionManager.hasSelection(state)).toBe(false);
        });

        it('should not delete when no selection exists', () => {
            expect(SelectionManager.hasSelection(state)).toBe(false);
            const initialShapeCount = state.scene.shapes.length;
            
            // Press Delete key with no selection
            const deleteEvent = new KeyboardEvent('keydown', {
                key: 'Delete',
                bubbles: true,
                cancelable: true
            });
            
            window.dispatchEvent(deleteEvent);
            
            // No shapes should be removed
            expect(state.scene.shapes.length).toBe(initialShapeCount);
        });
    });

    describe('Force Render Callbacks', () => {
        it('should trigger force render during drag selection', () => {
            mockForceRender.mockClear();
            
            // Start drag selection
            const dragStartEvent = createMouseEvent('mousedown', 5, 5);
            canvas.dispatchEvent(dragStartEvent);
            
            // Move during drag
            const dragMoveEvent = createMouseEvent('mousemove', 35, 35);
            window.dispatchEvent(dragMoveEvent);
            
            // Should have triggered force render during the drag
            expect(mockForceRender).toHaveBeenCalled();
        });

        it('should trigger force render during edit mode dragging', () => {
            // Setup: in edit mode with selection
            SelectionManager.setSelection(state, [state.scene.shapes[0].id]);
            state.tool = 'edit';
            
            mockForceRender.mockClear();
            
            // Start drag on a shape handle/area
            const dragStartEvent = createMouseEvent('mousedown', 20, 20);
            canvas.dispatchEvent(dragStartEvent);
            
            // Move during drag
            const dragMoveEvent = createMouseEvent('mousemove', 25, 25);
            window.dispatchEvent(dragMoveEvent);
            
            // Should have triggered force render during the edit drag
            expect(mockForceRender).toHaveBeenCalled();
        });
    });
});
