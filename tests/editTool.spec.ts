import { describe, it, expect, beforeEach } from 'vitest';
import { EditTool } from '../src/tools/editTool';
import { CommandExecutor } from '../src/commandExecutor';
import { createTestState, createTestRectangle, createTestLine, createTestCircle } from './helpers';
import type { State } from '../src/state';
import type { Path2DRenderer } from '../src/rendering/path2DRenderer';

describe('EditTool', () => {
    let editTool: EditTool;
    let executor: CommandExecutor;
    let canvas: HTMLCanvasElement;
    let state: State;
    let onHistoryChange: () => void;

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

        executor = new CommandExecutor();
        onHistoryChange = () => {};
        editTool = new EditTool(canvas, executor, mockRenderer, onHistoryChange);
        state = createTestState();
        state.tool = 'edit';
    });

    describe('getHandles', () => {
        it('should return handles for selected line', () => {
            const line = createTestLine({ id: 'line1', x1: 10, y1: 10, x2: 50, y2: 50 });
            state.scene.shapes.push(line);
            state.selection = ['line1'];

            const handles = editTool.getHandles(state);

            expect(handles).toHaveLength(2);
            expect(handles[0]).toEqual({ x: 10, y: 10, vertexIndex: 0, shapeId: 'line1' });
            expect(handles[1]).toEqual({ x: 50, y: 50, vertexIndex: 1, shapeId: 'line1' });
        });

        it('should return handles for selected rectangle', () => {
            const rect = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 30, height: 20 });
            state.scene.shapes.push(rect);
            state.selection = ['rect1'];

            const handles = editTool.getHandles(state);

            expect(handles).toHaveLength(4);
            expect(handles[0]).toEqual({ x: 10, y: 10, vertexIndex: 0, shapeId: 'rect1' }); // top-left
            expect(handles[1]).toEqual({ x: 40, y: 10, vertexIndex: 1, shapeId: 'rect1' }); // top-right
            expect(handles[2]).toEqual({ x: 40, y: 30, vertexIndex: 2, shapeId: 'rect1' }); // bottom-right
            expect(handles[3]).toEqual({ x: 10, y: 30, vertexIndex: 3, shapeId: 'rect1' }); // bottom-left
        });

        it('should return handles for selected circle', () => {
            const circle = createTestCircle({ id: 'circle1', x: 25, y: 25, radius: 15 });
            state.scene.shapes.push(circle);
            state.selection = ['circle1'];

            const handles = editTool.getHandles(state);

            expect(handles).toHaveLength(2);
            expect(handles[0]).toEqual({ x: 25, y: 25, vertexIndex: 0, shapeId: 'circle1' }); // center
            expect(handles[1]).toEqual({ x: 40, y: 25, vertexIndex: 1, shapeId: 'circle1' }); // radius point
        });

        it('should return no handles when no shapes are selected', () => {
            const line = createTestLine();
            state.scene.shapes.push(line);
            state.selection = [];

            const handles = editTool.getHandles(state);

            expect(handles).toHaveLength(0);
        });

        it('should return handles for multiple selected shapes', () => {
            const line = createTestLine({ id: 'line1', x1: 10, y1: 10, x2: 50, y2: 50 });
            const rect = createTestRectangle({ id: 'rect1', x: 60, y: 60, width: 30, height: 20 });
            state.scene.shapes.push(line, rect);
            state.selection = ['line1', 'rect1'];

            const handles = editTool.getHandles(state);

            expect(handles).toHaveLength(6); // 2 for line + 4 for rectangle
        });
    });

    describe('mouse interaction', () => {
        it('should not handle mouse events when not in edit mode', () => {
            state.tool = 'select';
            const mouseEvent = { button: 0, clientX: 100, clientY: 100 } as MouseEvent;

            const result = editTool.handleMouseDown(mouseEvent, state);

            expect(result).toBe(false);
        });

        it('should handle mouse down when in edit mode with selection', () => {
            const rect = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 30, height: 20 });
            state.scene.shapes.push(rect);
            state.selection = ['rect1'];
            state.tool = 'edit';

            // Mock mouse event that hits inside the rectangle
            const mouseEvent = { 
                button: 0, 
                clientX: 25, 
                clientY: 25 
            } as MouseEvent;

            const result = editTool.handleMouseDown(mouseEvent, state);

            expect(result).toBe(true);
        });
    });

    describe('group move functionality', () => {
        it('should start group move and store original positions', () => {
            const rect1 = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 20, height: 20 });
            const rect2 = createTestRectangle({ id: 'rect2', x: 40, y: 40, width: 20, height: 20 });
            state.scene.shapes.push(rect1, rect2);
            state.selection = ['rect1', 'rect2'];
            state.tool = 'edit';

            // Start drag inside first rectangle
            const mouseDownEvent = { button: 0, clientX: 20, clientY: 20 } as MouseEvent;
            const result = editTool.handleMouseDown(mouseDownEvent, state);

            expect(result).toBe(true);
            expect(state.currentEditing.isGroupMove).toBe(true);
            expect(state.currentEditing.isDragging).toBe(true);
            expect(state.currentEditing.dragStart).toEqual({ x: 20, y: 20 });
            
            // Check that original positions are stored
            const originalPositions = (state.currentEditing as any).originalPositions;
            expect(originalPositions).toBeDefined();
            expect(originalPositions['rect1']).toEqual({ x: 10, y: 10, width: 20, height: 20 });
            expect(originalPositions['rect2']).toEqual({ x: 40, y: 40, width: 20, height: 20 });
        });

        it('should update shapes during mouse move', () => {
            const rect = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 20, height: 20 });
            state.scene.shapes.push(rect);
            state.selection = ['rect1'];
            state.tool = 'edit';

            // Start drag
            const mouseDownEvent = { button: 0, clientX: 20, clientY: 20 } as MouseEvent;
            editTool.handleMouseDown(mouseDownEvent, state);

            // Move mouse
            const mouseMoveEvent = { clientX: 30, clientY: 25 } as MouseEvent;
            const result = editTool.handleMouseMove(mouseMoveEvent, state);

            expect(result).toBe(true);
            
            // Shape should be moved to original position + delta
            expect(rect.x).toBe(20); // 10 + (30 - 20)
            expect(rect.y).toBe(15); // 10 + (25 - 20)
            expect(rect.width).toBe(20); // unchanged
            expect(rect.height).toBe(20); // unchanged
            
            // Check total delta is stored
            const totalDelta = (state.currentEditing as any).totalDelta;
            expect(totalDelta).toEqual({ x: 10, y: 5 });
        });

        it('should reset shapes to original positions and apply command on mouse up', () => {
            const rect = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 20, height: 20 });
            state.scene.shapes.push(rect);
            state.selection = ['rect1'];
            state.tool = 'edit';

            // Start drag
            const mouseDownEvent = { button: 0, clientX: 20, clientY: 20 } as MouseEvent;
            editTool.handleMouseDown(mouseDownEvent, state);

            // Move mouse to simulate drag
            const mouseMoveEvent = { clientX: 35, clientY: 30 } as MouseEvent;
            editTool.handleMouseMove(mouseMoveEvent, state);
            
            // Verify shape was moved during drag
            expect(rect.x).toBe(25); // 10 + (35 - 20)
            expect(rect.y).toBe(20); // 10 + (30 - 20)

            // Mock command execution to track if it was called
            let commandExecuted = false;
            let executedCommand: any = null;
            const originalExecute = executor.execute;
            executor.execute = (command: any) => {
                commandExecuted = true;
                executedCommand = command;
                originalExecute.call(executor, command, state);
            };

            // End drag
            const result = editTool.handleMouseUp(state);

            expect(result).toBe(true);
            expect(commandExecuted).toBe(true);
            expect(executedCommand.dx).toBe(15); // 35 - 20
            expect(executedCommand.dy).toBe(10); // 30 - 20
            
            // Shape should be at final position after command execution
            expect(rect.x).toBe(25); // 10 + 15
            expect(rect.y).toBe(20); // 10 + 10
            
            // Editing state should be reset
            expect(state.currentEditing.isDragging).toBe(false);
            expect(state.currentEditing.isGroupMove).toBe(false);
            expect(state.currentEditing.dragStart).toBe(null);
            expect((state.currentEditing as any).originalPositions).toBe(null);
            expect((state.currentEditing as any).totalDelta).toBe(null);

            // Restore original executor
            executor.execute = originalExecute;
        });

        it('should handle multiple shapes correctly', () => {
            const rect1 = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 20, height: 20 });
            const rect2 = createTestRectangle({ id: 'rect2', x: 50, y: 50, width: 15, height: 15 });
            const circle = createTestCircle({ id: 'circle1', x: 100, y: 100, radius: 10 });
            
            state.scene.shapes.push(rect1, rect2, circle);
            state.selection = ['rect1', 'rect2', 'circle1'];
            state.tool = 'edit';

            // Start drag
            editTool.handleMouseDown({ button: 0, clientX: 20, clientY: 20 } as MouseEvent, state);
            
            // Move mouse
            editTool.handleMouseMove({ clientX: 30, clientY: 35 } as MouseEvent, state);
            
            // Check all shapes moved by the same delta
            expect(rect1.x).toBe(20); // 10 + (30 - 20)
            expect(rect1.y).toBe(25); // 10 + (35 - 20)
            expect(rect2.x).toBe(60); // 50 + (30 - 20)
            expect(rect2.y).toBe(65); // 50 + (35 - 20)
            expect(circle.x).toBe(110); // 100 + (30 - 20)
            expect(circle.y).toBe(115); // 100 + (35 - 20)
            
            // End drag and verify final positions
            editTool.handleMouseUp(state);
            
            expect(rect1.x).toBe(20);
            expect(rect1.y).toBe(25);
            expect(rect2.x).toBe(60);
            expect(rect2.y).toBe(65);
            expect(circle.x).toBe(110);
            expect(circle.y).toBe(115);
        });

        it('should not create command when no movement occurs', () => {
            const rect = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 20, height: 20 });
            state.scene.shapes.push(rect);
            state.selection = ['rect1'];
            state.tool = 'edit';

            // Mock command execution
            let commandExecuted = false;
            const originalExecute = executor.execute;
            executor.execute = () => { commandExecuted = true; };

            // Start and end drag at the same position
            editTool.handleMouseDown({ button: 0, clientX: 20, clientY: 20 } as MouseEvent, state);
            editTool.handleMouseUp(state);

            expect(commandExecuted).toBe(false);
            
            // Shape should remain at original position
            expect(rect.x).toBe(10);
            expect(rect.y).toBe(10);

            // Restore original executor
            executor.execute = originalExecute;
        });

        it('should handle drag with very small movements', () => {
            const rect = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 20, height: 20 });
            state.scene.shapes.push(rect);
            state.selection = ['rect1'];
            state.tool = 'edit';

            // Start drag
            editTool.handleMouseDown({ button: 0, clientX: 20, clientY: 20 } as MouseEvent, state);
            
            // Very small movement
            editTool.handleMouseMove({ clientX: 20.5, clientY: 20.3 } as MouseEvent, state);
            
            // Check shape moved by small delta
            expect(rect.x).toBe(10.5); // 10 + (20.5 - 20)
            expect(rect.y).toBe(10.3); // 10 + (20.3 - 20)
            
            editTool.handleMouseUp(state);
            
            // Final position should reflect the small movement
            expect(rect.x).toBe(10.5);
            expect(rect.y).toBe(10.3);
        });
    });

    describe('selection changes in edit mode', () => {
        it('should return false when clicking outside selected shapes', () => {
            const rect = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 20, height: 20 });
            state.scene.shapes.push(rect);
            state.selection = ['rect1'];
            state.tool = 'edit';

            // Click outside the rectangle (which is at 10,10 with size 20x20)
            const mouseEvent = { button: 0, clientX: 50, clientY: 50 } as MouseEvent;
            const result = editTool.handleMouseDown(mouseEvent, state);

            // Should return false since click is not on handles or inside shape
            expect(result).toBe(false);
            
            // Should not start any drag operation
            expect(state.currentEditing.isDragging).toBe(false);
            expect(state.currentEditing.isGroupMove).toBe(false);
        });

        it('should return false when clicking on unselected shape', () => {
            const rect1 = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 20, height: 20 });
            const rect2 = createTestRectangle({ id: 'rect2', x: 50, y: 50, width: 20, height: 20 });
            state.scene.shapes.push(rect1, rect2);
            state.selection = ['rect1']; // Only rect1 is selected
            state.tool = 'edit';

            // Click on rect2 (unselected shape)
            const mouseEvent = { button: 0, clientX: 60, clientY: 60 } as MouseEvent;
            const result = editTool.handleMouseDown(mouseEvent, state);

            // Should return false since clicking on unselected shape
            expect(result).toBe(false);
            
            // Should not start any drag operation
            expect(state.currentEditing.isDragging).toBe(false);
            expect(state.currentEditing.isGroupMove).toBe(false);
        });

        it('should still allow editing when clicking on selected shape', () => {
            const rect = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 20, height: 20 });
            state.scene.shapes.push(rect);
            state.selection = ['rect1'];
            state.tool = 'edit';

            // Click inside the selected rectangle
            const mouseEvent = { button: 0, clientX: 20, clientY: 20 } as MouseEvent;
            const result = editTool.handleMouseDown(mouseEvent, state);

            // Should return true and start group move
            expect(result).toBe(true);
            expect(state.currentEditing.isDragging).toBe(true);
            expect(state.currentEditing.isGroupMove).toBe(true);
        });

        it('should still allow vertex editing when clicking on handles', () => {
            const rect = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 20, height: 20 });
            state.scene.shapes.push(rect);
            state.selection = ['rect1'];
            state.tool = 'edit';

            // Click exactly on a handle (top-left corner)
            const mouseEvent = { button: 0, clientX: 10, clientY: 10 } as MouseEvent;
            const result = editTool.handleMouseDown(mouseEvent, state);

            // Should return true and start vertex editing
            expect(result).toBe(true);
            expect(state.currentEditing.isDragging).toBe(true);
            expect(state.currentEditing.isGroupMove).toBe(false);
            expect(state.currentEditing.shapeId).toBe('rect1');
            expect(state.currentEditing.vertexIndex).toBe(0);
        });

        it('should return false for empty selection in edit mode', () => {
            const rect = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 20, height: 20 });
            state.scene.shapes.push(rect);
            state.selection = []; // No selection
            state.tool = 'edit';

            // Click anywhere
            const mouseEvent = { button: 0, clientX: 20, clientY: 20 } as MouseEvent;
            const result = editTool.handleMouseDown(mouseEvent, state);

            // Should return false since no shapes are selected
            expect(result).toBe(false);
            expect(state.currentEditing.isDragging).toBe(false);
        });

        it('should return false for right-click even on selected shapes', () => {
            const rect = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 20, height: 20 });
            state.scene.shapes.push(rect);
            state.selection = ['rect1'];
            state.tool = 'edit';

            // Right-click inside the selected rectangle
            const mouseEvent = { button: 2, clientX: 20, clientY: 20 } as MouseEvent;
            const result = editTool.handleMouseDown(mouseEvent, state);

            // Should return false for right-click
            expect(result).toBe(false);
            expect(state.currentEditing.isDragging).toBe(false);
        });

        it('should maintain edit mode functionality after returning false', () => {
            const rect = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 20, height: 20 });
            state.scene.shapes.push(rect);
            state.selection = ['rect1'];
            state.tool = 'edit';

            // First click outside (should return false)
            let mouseEvent = { button: 0, clientX: 50, clientY: 50 } as MouseEvent;
            let result = editTool.handleMouseDown(mouseEvent, state);
            expect(result).toBe(false);

            // Second click inside selected shape (should still work)
            mouseEvent = { button: 0, clientX: 20, clientY: 20 } as MouseEvent;
            result = editTool.handleMouseDown(mouseEvent, state);
            expect(result).toBe(true);
            expect(state.currentEditing.isDragging).toBe(true);
            expect(state.currentEditing.isGroupMove).toBe(true);
        });
    });
});
