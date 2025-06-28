import { describe, it, expect, beforeEach } from 'vitest';
import { EditTool } from '../src/tools/editTool';
import { CommandExecutor } from '../src/commandExecutor';
import { createTestState, createTestRectangle, createTestLine, createTestCircle } from './helpers';
import type { State } from '../src/state';

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

        executor = new CommandExecutor();
        onHistoryChange = () => {};
        editTool = new EditTool(canvas, executor, onHistoryChange);
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
});
