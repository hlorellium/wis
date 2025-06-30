import { describe, it, expect, beforeEach } from 'vitest';
import { EditTool } from '../src/tools/editTool';
import { CommandExecutor } from '../src/commandExecutor';
import { HistoryManager } from '../src/history';
import { createTestState, createTestRectangle } from './helpers';
import type { State } from '../src/state';
import type { Path2DRenderer } from '../src/rendering/path2DRenderer';

describe('EditTool History Debug', () => {
    let editTool: EditTool;
    let executor: CommandExecutor;
    let history: HistoryManager;
    let canvas: HTMLCanvasElement;
    let state: State;
    let onHistoryChange: () => void;
    let historyChanged: boolean;

    beforeEach(() => {
        // Create a mock canvas
        canvas = {
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
            width: 800,
            height: 600
        } as HTMLCanvasElement;

        // Create a mock renderer
        const mockRenderer = {
            clearCache: () => {}
        } as Path2DRenderer;

        history = new HistoryManager();
        executor = new CommandExecutor();
        // Connect executor to history
        executor.setHistory(history);
        
        historyChanged = false;
        onHistoryChange = () => { historyChanged = true; };
        editTool = new EditTool(canvas, executor, mockRenderer, onHistoryChange);
        state = createTestState();
        state.tool = 'edit';
    });

    it('should track history properly for edit operations', () => {
        // Setup
        const rect = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 20, height: 20 });
        state.scene.shapes.push(rect);
        state.selection = ['rect1'];

        console.log('Initial history state:', {
            canUndo: history.canUndo(),
            canRedo: history.canRedo(),
            undoStackSize: history.getHistorySize().undo,
            redoStackSize: history.getHistorySize().redo
        });

        // Perform edit operation
        const mouseDownEvent = { button: 0, clientX: 20, clientY: 20 } as MouseEvent;
        editTool.handleMouseDown(mouseDownEvent, state);

        const mouseMoveEvent = { clientX: 35, clientY: 30 } as MouseEvent;
        editTool.handleMouseMove(mouseMoveEvent, state);

        const upResult = editTool.handleMouseUp(state);

        console.log('After edit operation:', {
            upResult,
            historyChanged,
            canUndo: history.canUndo(),
            canRedo: history.canRedo(),
            undoStackSize: history.getHistorySize().undo,
            redoStackSize: history.getHistorySize().redo
        });

        // Check the final shape position
        const finalShape = state.scene.shapes.find(s => s.id === 'rect1') as any;
        console.log('Final shape position:', { x: finalShape?.x, y: finalShape?.y });

        expect(upResult).toBe(true);
        expect(historyChanged).toBe(true);
        expect(history.canUndo()).toBe(true);
        expect(finalShape.x).toBe(25); // 10 + 15
        expect(finalShape.y).toBe(20); // 10 + 10
    });

    it('should handle vertex editing with proper history tracking', () => {
        // Setup
        const rect = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 20, height: 20 });
        state.scene.shapes.push(rect);
        state.selection = ['rect1'];

        console.log('Initial history state for vertex edit:', {
            canUndo: history.canUndo(),
            canRedo: history.canRedo()
        });

        // Perform vertex edit (click on handle at top-left corner)
        const mouseDownEvent = { button: 0, clientX: 10, clientY: 10 } as MouseEvent;
        editTool.handleMouseDown(mouseDownEvent, state);

        const mouseMoveEvent = { clientX: 5, clientY: 5 } as MouseEvent;
        editTool.handleMouseMove(mouseMoveEvent, state);

        const upResult = editTool.handleMouseUp(state);

        console.log('After vertex edit operation:', {
            upResult,
            historyChanged,
            canUndo: history.canUndo(),
            undoStackSize: history.getHistorySize().undo
        });

        // Check the final shape 
        const finalShape = state.scene.shapes.find(s => s.id === 'rect1') as any;
        console.log('Final shape after vertex edit:', { 
            x: finalShape?.x, 
            y: finalShape?.y, 
            width: finalShape?.width, 
            height: finalShape?.height 
        });

        expect(upResult).toBe(true);
        expect(historyChanged).toBe(true);
        expect(history.canUndo()).toBe(true);
    });
});
