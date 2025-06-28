import { describe, it, expect, beforeEach } from 'vitest';
import { MoveShapesCommand, MoveVertexCommand } from '../src/commands';
import { createTestState, createTestRectangle, createTestLine, createTestCircle } from './helpers';
import type { State } from '../src/state';

describe('Move Commands', () => {
    let state: State;

    beforeEach(() => {
        state = createTestState();
    });

    describe('MoveShapesCommand', () => {
        it('should move multiple shapes by delta', () => {
            const rect = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 30, height: 20 });
            const line = createTestLine({ id: 'line1', x1: 5, y1: 5, x2: 15, y2: 15 });
            state.scene.shapes.push(rect, line);

            const command = new MoveShapesCommand(['rect1', 'line1'], 10, 5);
            command.apply(state);

            expect(rect.x).toBe(20);
            expect(rect.y).toBe(15);
            expect(line.x1).toBe(15);
            expect(line.y1).toBe(10);
            expect(line.x2).toBe(25);
            expect(line.y2).toBe(20);
        });

        it('should undo shape movement', () => {
            const rect = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 30, height: 20 });
            state.scene.shapes.push(rect);

            const command = new MoveShapesCommand(['rect1'], 10, 5);
            command.apply(state);
            command.invert(state);

            expect(rect.x).toBe(10);
            expect(rect.y).toBe(10);
        });

        it('should merge commands with same shape set', () => {
            const command1 = new MoveShapesCommand(['rect1'], 10, 5);
            const command2 = new MoveShapesCommand(['rect1'], 5, 10);

            const merged = command1.merge(command2);

            expect(merged).not.toBeNull();
            expect(merged).toBeInstanceOf(MoveShapesCommand);
            
            const serialized = (merged as MoveShapesCommand).serialize();
            expect(serialized.dx).toBe(15);
            expect(serialized.dy).toBe(15);
        });

        it('should not merge commands with different shape sets', () => {
            const command1 = new MoveShapesCommand(['rect1'], 10, 5);
            const command2 = new MoveShapesCommand(['rect2'], 5, 10);

            const merged = command1.merge(command2);

            expect(merged).toBeNull();
        });

        it('should serialize and include all data', () => {
            const command = new MoveShapesCommand(['rect1', 'line1'], 10, 5);
            const serialized = command.serialize();

            expect(serialized.shapeIds).toEqual(['rect1', 'line1']);
            expect(serialized.dx).toBe(10);
            expect(serialized.dy).toBe(5);
            expect(serialized.id).toBeDefined();
            expect(serialized.timestamp).toBeDefined();
        });
    });

    describe('MoveVertexCommand', () => {
        it('should move line vertex', () => {
            const line = createTestLine({ id: 'line1', x1: 10, y1: 10, x2: 50, y2: 50 });
            state.scene.shapes.push(line);

            const command = new MoveVertexCommand('line1', 0, { x: 10, y: 10 }, { x: 20, y: 20 });
            command.apply(state);

            expect(line.x1).toBe(20);
            expect(line.y1).toBe(20);
            expect(line.x2).toBe(50); // unchanged
            expect(line.y2).toBe(50); // unchanged
        });

        it('should move rectangle corner', () => {
            const rect = createTestRectangle({ id: 'rect1', x: 10, y: 10, width: 30, height: 20 });
            state.scene.shapes.push(rect);

            // Move top-left corner (vertex 0)
            const command = new MoveVertexCommand('rect1', 0, { x: 10, y: 10 }, { x: 15, y: 15 });
            command.apply(state);

            expect(rect.x).toBe(15);
            expect(rect.y).toBe(15);
            expect(rect.width).toBe(25); // adjusted
            expect(rect.height).toBe(15); // adjusted
        });

        it('should resize circle radius with vertex 0 (East handle)', () => {
            const circle = createTestCircle({ id: 'circle1', x: 25, y: 25, radius: 15 });
            state.scene.shapes.push(circle);

            // Move East handle (vertex 0) from (40, 25) to (30, 25)
            const command = new MoveVertexCommand('circle1', 0, { x: 40, y: 25 }, { x: 30, y: 25 });
            command.apply(state);

            expect(circle.x).toBe(25); // unchanged
            expect(circle.y).toBe(25); // unchanged
            expect(circle.radius).toBe(5); // distance from center (25,25) to new point (30,25)
        });

        it('should resize circle radius', () => {
            const circle = createTestCircle({ id: 'circle1', x: 25, y: 25, radius: 15 });
            state.scene.shapes.push(circle);

            // Move radius point (vertex 1)
            const command = new MoveVertexCommand('circle1', 1, { x: 40, y: 25 }, { x: 35, y: 25 });
            command.apply(state);

            expect(circle.x).toBe(25); // unchanged
            expect(circle.y).toBe(25); // unchanged
            expect(circle.radius).toBe(10); // distance from center to new point
        });

        it('should undo vertex movement', () => {
            const line = createTestLine({ id: 'line1', x1: 10, y1: 10, x2: 50, y2: 50 });
            state.scene.shapes.push(line);

            const command = new MoveVertexCommand('line1', 0, { x: 10, y: 10 }, { x: 20, y: 20 });
            command.apply(state);
            command.invert(state);

            expect(line.x1).toBe(10);
            expect(line.y1).toBe(10);
        });

        it('should serialize and include all data', () => {
            const command = new MoveVertexCommand('line1', 0, { x: 10, y: 10 }, { x: 20, y: 20 });
            const serialized = command.serialize();

            expect(serialized.shapeId).toBe('line1');
            expect(serialized.vertexIndex).toBe(0);
            expect(serialized.oldPos).toEqual({ x: 10, y: 10 });
            expect(serialized.newPos).toEqual({ x: 20, y: 20 });
            expect(serialized.id).toBeDefined();
            expect(serialized.timestamp).toBeDefined();
        });
    });
});
