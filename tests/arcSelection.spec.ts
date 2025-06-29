import { describe, it, expect, beforeEach } from 'vitest';
import { SelectTool } from '../src/tools/selectTool';
import { EditTool } from '../src/tools/editTool';
import type { State, BezierCurveShape, CircleShape } from '../src/state';
import { generateId } from '../src/constants';
import { SelectionManager } from '../src/utils/selectionManager';
import { createTestState } from './helpers';

// Mock canvas and dependencies
const mockCanvas = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    width: 800,
    height: 600
} as HTMLCanvasElement;

const mockExecutor = {
    execute: () => {},
} as any;

const mockRenderer = {
    clearCache: () => {}
} as any;

const mockOnHistoryChange = () => {};

describe('Arc Selection and Circle Editing', () => {
    let selectTool: SelectTool;
    let editTool: EditTool;
    let state: State;

    beforeEach(() => {
        selectTool = new SelectTool(mockCanvas);
        editTool = new EditTool(mockCanvas, mockExecutor, mockRenderer, mockOnHistoryChange);
        
        state = createTestState();
        state.tool = 'select';
    });

    describe('Bezier/Arc Selection', () => {
        it('should select bezier curve (arc) when clicked inside bounding box', () => {
            // Create a bezier curve that represents an arc
            const arcShape: BezierCurveShape = {
                id: generateId(),
                type: 'bezier',
                color: '#ff0000',
                points: [
                    { x: 50, y: 100 },   // start point
                    { x: 75, y: 50 },    // control point 1
                    { x: 125, y: 50 },   // control point 2
                    { x: 150, y: 100 }   // end point
                ]
            };

            state.scene.shapes = [arcShape];

            // Mock mouse event inside the bounding box
            const mouseEvent = {
                button: 0,
                clientX: 100, // Middle of the arc's bounding box
                clientY: 75
            } as MouseEvent;

            const result = selectTool.handleMouseDown(mouseEvent, state);

            expect(result).toBe(true);
            expect(state.selection).toContain(arcShape.id);
        });

        it('should not select bezier curve when clicked outside bounding box', () => {
            const arcShape: BezierCurveShape = {
                id: generateId(),
                type: 'bezier',
                color: '#ff0000',
                points: [
                    { x: 50, y: 100 },
                    { x: 75, y: 50 },
                    { x: 125, y: 50 },
                    { x: 150, y: 100 }
                ]
            };

            state.scene.shapes = [arcShape];

            // Click far outside the bounding box
            const mouseEvent = {
                button: 0,
                clientX: 300,
                clientY: 300
            } as MouseEvent;

            const result = selectTool.handleMouseDown(mouseEvent, state);

            expect(result).toBe(true); // Tool handled the event
            expect(state.selection).not.toContain(arcShape.id);
        });
    });

    describe('Circle 4-Handle Editing', () => {
        it('should provide 4 handles for a circle', () => {
            const circleShape: CircleShape = {
                id: generateId(),
                type: 'circle',
                color: '#00ff00',
                x: 100,
                y: 100,
                radius: 50
            };

            state.scene.shapes = [circleShape];
            state.selection = [circleShape.id];
            state.tool = 'edit';

            const handles = editTool.getHandles(state);

            expect(handles).toHaveLength(4);
            
            // Check handle positions (East, South, West, North)
            expect(handles[0]).toEqual({
                x: 150, y: 100, vertexIndex: 0, shapeId: circleShape.id // East
            });
            expect(handles[1]).toEqual({
                x: 100, y: 150, vertexIndex: 1, shapeId: circleShape.id // South
            });
            expect(handles[2]).toEqual({
                x: 50, y: 100, vertexIndex: 2, shapeId: circleShape.id // West
            });
            expect(handles[3]).toEqual({
                x: 100, y: 50, vertexIndex: 3, shapeId: circleShape.id // North
            });
        });

        it('should update circle radius when dragging any handle', () => {
            const circleShape: CircleShape = {
                id: generateId(),
                type: 'circle',
                color: '#00ff00',
                x: 100,
                y: 100,
                radius: 50
            };

            state.scene.shapes = [circleShape];
            state.selection = [circleShape.id];
            state.tool = 'edit';

            // Start dragging the East handle (index 0)
            const mouseDownEvent = {
                button: 0,
                clientX: 150, // East handle position
                clientY: 100
            } as MouseEvent;

            editTool.handleMouseDown(mouseDownEvent, state);
            expect(state.currentEditing.isDragging).toBe(true);
            expect(state.currentEditing.vertexIndex).toBe(0);

            // Move to a new position to change radius
            const mouseMoveEvent = {
                clientX: 175, // Move further east
                clientY: 100
            } as MouseEvent;

            editTool.handleMouseMove(mouseMoveEvent, state);

            // Circle radius should be updated to distance from center to new position
            const expectedRadius = Math.sqrt((175 - 100) ** 2 + (100 - 100) ** 2);
            expect(circleShape.radius).toBeCloseTo(expectedRadius, 1);
        });

        it('should update radius correctly when dragging South handle', () => {
            const circleShape: CircleShape = {
                id: generateId(),
                type: 'circle',
                color: '#00ff00',
                x: 100,
                y: 100,
                radius: 50
            };

            state.scene.shapes = [circleShape];
            state.selection = [circleShape.id];
            state.tool = 'edit';

            // Start dragging the South handle (index 1)
            const mouseDownEvent = {
                button: 0,
                clientX: 100,
                clientY: 150 // South handle position
            } as MouseEvent;

            editTool.handleMouseDown(mouseDownEvent, state);

            // Move to increase radius
            const mouseMoveEvent = {
                clientX: 100,
                clientY: 180 // Move further south
            } as MouseEvent;

            editTool.handleMouseMove(mouseMoveEvent, state);

            // Radius should be 80 (distance from center to new position)
            expect(circleShape.radius).toBeCloseTo(80, 1);
        });

        it('should update radius correctly when dragging West handle', () => {
            const circleShape: CircleShape = {
                id: generateId(),
                type: 'circle',
                color: '#00ff00',
                x: 100,
                y: 100,
                radius: 50
            };

            state.scene.shapes = [circleShape];
            state.selection = [circleShape.id];
            state.tool = 'edit';

            // Start dragging the West handle (index 2)
            const mouseDownEvent = {
                button: 0,
                clientX: 50, // West handle position
                clientY: 100
            } as MouseEvent;

            editTool.handleMouseDown(mouseDownEvent, state);

            // Move to decrease radius
            const mouseMoveEvent = {
                clientX: 75, // Move closer to center
                clientY: 100
            } as MouseEvent;

            editTool.handleMouseMove(mouseMoveEvent, state);

            // Radius should be 25 (distance from center to new position)
            expect(circleShape.radius).toBeCloseTo(25, 1);
        });

        it('should update radius correctly when dragging North handle', () => {
            const circleShape: CircleShape = {
                id: generateId(),
                type: 'circle',
                color: '#00ff00',
                x: 100,
                y: 100,
                radius: 50
            };

            state.scene.shapes = [circleShape];
            state.selection = [circleShape.id];
            state.tool = 'edit';

            // Start dragging the North handle (index 3)
            const mouseDownEvent = {
                button: 0,
                clientX: 100,
                clientY: 50 // North handle position
            } as MouseEvent;

            editTool.handleMouseDown(mouseDownEvent, state);

            // Move to a diagonal position
            const mouseMoveEvent = {
                clientX: 120, // Move diagonally
                clientY: 80
            } as MouseEvent;

            editTool.handleMouseMove(mouseMoveEvent, state);

            // Radius should be distance from center (100,100) to new position (120,80)
            const expectedRadius = Math.sqrt((120 - 100) ** 2 + (80 - 100) ** 2);
            expect(circleShape.radius).toBeCloseTo(expectedRadius, 1);
        });
    });

    describe('Integration: Selection to Editing', () => {
        it('should select arc and then provide bezier handles in edit mode', () => {
            const arcShape: BezierCurveShape = {
                id: generateId(),
                type: 'bezier',
                color: '#ff0000',
                points: [
                    { x: 50, y: 100 },
                    { x: 75, y: 50 },
                    { x: 125, y: 50 },
                    { x: 150, y: 100 }
                ]
            };

            state.scene.shapes = [arcShape];

            // First select the arc
            const selectEvent = {
                button: 0,
                clientX: 100,
                clientY: 75
            } as MouseEvent;

            selectTool.handleMouseDown(selectEvent, state);
            expect(state.selection).toContain(arcShape.id);

            // Switch to edit mode
            state.tool = 'edit';
            const handles = editTool.getHandles(state);

            // Should have 4 handles (one for each bezier point)
            expect(handles).toHaveLength(4);
            expect(handles[0]).toEqual({
                x: 50, y: 100, vertexIndex: 0, shapeId: arcShape.id
            });
            expect(handles[3]).toEqual({
                x: 150, y: 100, vertexIndex: 3, shapeId: arcShape.id
            });
        });

        it('should select circle and provide 4 radius handles in edit mode', () => {
            const circleShape: CircleShape = {
                id: generateId(),
                type: 'circle',
                color: '#00ff00',
                x: 100,
                y: 100,
                radius: 50
            };

            state.scene.shapes = [circleShape];

            // First select the circle
            const selectEvent = {
                button: 0,
                clientX: 100, // Click on center
                clientY: 100
            } as MouseEvent;

            selectTool.handleMouseDown(selectEvent, state);
            expect(state.selection).toContain(circleShape.id);

            // Switch to edit mode
            state.tool = 'edit';
            const handles = editTool.getHandles(state);

            // Should have exactly 4 handles at compass points
            expect(handles).toHaveLength(4);
        });
    });
});
