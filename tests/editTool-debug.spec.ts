import { describe, it, expect, beforeEach } from 'vitest';
import { EditTool } from '../src/tools/editTool';
import { CommandExecutor } from '../src/commandExecutor';
import { createTestState, createTestRectangle } from './helpers';
import type { State } from '../src/state';
import type { Path2DRenderer } from '../src/rendering/path2DRenderer';

describe('EditTool Debug', () => {
    let editTool: EditTool;
    let executor: CommandExecutor;
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

        executor = new CommandExecutor();
        historyChanged = false;
        onHistoryChange = () => { historyChanged = true; };
        editTool = new EditTool(canvas, executor, mockRenderer, onHistoryChange);
        state = createTestState();
        state.tool = 'edit';
    });

    it('should handle complete edit workflow for group move', () => {
        // Setup
        const rect = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 20, height: 20 });
        state.scene.shapes.push(rect);
        state.selection = ['rect1'];

        console.log('Initial shape position:', rect.x, rect.y);

        // Start drag inside rectangle
        const mouseDownEvent = { button: 0, clientX: 20, clientY: 20 } as MouseEvent;
        const downResult = editTool.handleMouseDown(mouseDownEvent, state);
        
        console.log('Mouse down result:', downResult);
        console.log('Editing state after down:', {
            isDragging: state.currentEditing.isDragging,
            isGroupMove: state.currentEditing.isGroupMove,
            dragStart: state.currentEditing.dragStart,
            hasPreview: !!state.currentEditing.previewShapes,
            hasOriginal: !!state.currentEditing.originalShapes
        });

        expect(downResult).toBe(true);
        expect(state.currentEditing.isDragging).toBe(true);
        expect(state.currentEditing.isGroupMove).toBe(true);

        // Move mouse to simulate drag
        const mouseMoveEvent = { clientX: 35, clientY: 30 } as MouseEvent;
        const moveResult = editTool.handleMouseMove(mouseMoveEvent, state);
        
        console.log('Mouse move result:', moveResult);
        console.log('Shape position after move (should be preview):', rect.x, rect.y);

        expect(moveResult).toBe(true);

        // End drag
        const upResult = editTool.handleMouseUp(state);
        
        console.log('Mouse up result:', upResult);
        console.log('Final shape position:', rect.x, rect.y);
        console.log('History changed:', historyChanged);
        console.log('Editing state after up:', {
            isDragging: state.currentEditing.isDragging,
            isGroupMove: state.currentEditing.isGroupMove,
            dragStart: state.currentEditing.dragStart,
            hasPreview: !!state.currentEditing.previewShapes,
            hasOriginal: !!state.currentEditing.originalShapes
        });

        expect(upResult).toBe(true);
        expect(historyChanged).toBe(true);
        
        // Check the shape in the state (not the original reference)
        const finalShape = state.scene.shapes.find(s => s.id === 'rect1') as any;
        console.log('Final shape in state:', finalShape);
        
        // Final position should reflect the movement
        expect(finalShape!.x).toBeGreaterThan(10);
        expect(finalShape!.y).toBeGreaterThan(10);
    });

    it('should handle vertex editing workflow', () => {
        // Setup
        const rect = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 20, height: 20 });
        state.scene.shapes.push(rect);
        state.selection = ['rect1'];

        console.log('Initial rectangle:', { x: rect.x, y: rect.y, width: rect.width, height: rect.height });

        // Start drag on top-left corner handle (10, 10)
        const mouseDownEvent = { button: 0, clientX: 10, clientY: 10 } as MouseEvent;
        const downResult = editTool.handleMouseDown(mouseDownEvent, state);
        
        console.log('Vertex mouse down result:', downResult);
        console.log('Vertex editing state:', {
            isDragging: state.currentEditing.isDragging,
            isGroupMove: state.currentEditing.isGroupMove,
            shapeId: state.currentEditing.shapeId,
            vertexIndex: state.currentEditing.vertexIndex
        });

        expect(downResult).toBe(true);
        expect(state.currentEditing.isDragging).toBe(true);
        expect(state.currentEditing.isGroupMove).toBe(false);
        expect(state.currentEditing.shapeId).toBe('rect1');
        expect(state.currentEditing.vertexIndex).toBe(0);

        // Move the handle
        const mouseMoveEvent = { clientX: 5, clientY: 5 } as MouseEvent;
        const moveResult = editTool.handleMouseMove(mouseMoveEvent, state);
        
        console.log('Vertex move result:', moveResult);
        console.log('Rectangle after vertex move:', { x: rect.x, y: rect.y, width: rect.width, height: rect.height });

        expect(moveResult).toBe(true);

        // End drag
        const upResult = editTool.handleMouseUp(state);
        
        console.log('Vertex up result:', upResult);
        console.log('Final rectangle:', { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
        console.log('History changed:', historyChanged);

        expect(upResult).toBe(true);
        expect(historyChanged).toBe(true);
    });
});
