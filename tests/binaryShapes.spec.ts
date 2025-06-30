import { describe, it, expect } from 'vitest';
import { ShapeBuffer, ShapeType, StyleData } from '../src/core/binary/shapeBuffer';
import { BinaryShapeWrapper } from '../src/core/binary/binaryShapeWrapper';
import { BinaryShapeArray } from '../src/core/binary/binaryShapeArray';

describe('Binary Shape Infrastructure', () => {
    const defaultStyles: StyleData = {
        fillMode: 'stroke',
        strokeColor: '#ff0000',
        fillColor: '#00ff00',
        strokeStyle: 'solid',
        strokeWidth: 2
    };

    describe('ShapeBuffer', () => {
        it('should create a rectangle buffer with correct data', () => {
            const buffer = ShapeBuffer.createRectangle('rect1', 10, 20, 100, 50, defaultStyles);
            
            expect(buffer.byteLength).toBe(40);
            expect(ShapeBuffer.readType(buffer)).toBe(ShapeType.RECTANGLE);
            expect(ShapeBuffer.readStrokeWidth(buffer)).toBe(2);
            expect(ShapeBuffer.readColor(buffer, 8)).toBe('#ff0000'); // stroke color
            expect(ShapeBuffer.readColor(buffer, 12)).toBe('#00ff00'); // fill color
            
            // Check geometry
            const view = new DataView(buffer);
            expect(view.getFloat32(24, true)).toBe(10); // x
            expect(view.getFloat32(28, true)).toBe(20); // y
            expect(view.getFloat32(32, true)).toBe(100); // width
            expect(view.getFloat32(36, true)).toBe(50); // height
        });

        it('should create a line buffer with correct data', () => {
            const buffer = ShapeBuffer.createLine('line1', 0, 0, 100, 100, defaultStyles);
            
            expect(buffer.byteLength).toBe(40);
            expect(ShapeBuffer.readType(buffer)).toBe(ShapeType.LINE);
            
            const view = new DataView(buffer);
            expect(view.getFloat32(24, true)).toBe(0); // x1
            expect(view.getFloat32(28, true)).toBe(0); // y1
            expect(view.getFloat32(32, true)).toBe(100); // x2
            expect(view.getFloat32(36, true)).toBe(100); // y2
        });

        it('should create a circle buffer with correct data', () => {
            const buffer = ShapeBuffer.createCircle('circle1', 50, 50, 25, defaultStyles);
            
            expect(buffer.byteLength).toBe(36);
            expect(ShapeBuffer.readType(buffer)).toBe(ShapeType.CIRCLE);
            
            const view = new DataView(buffer);
            expect(view.getFloat32(24, true)).toBe(50); // x
            expect(view.getFloat32(28, true)).toBe(50); // y
            expect(view.getFloat32(32, true)).toBe(25); // radius
        });

        it('should create a bezier buffer with correct data', () => {
            const points = [
                { x: 0, y: 0 },
                { x: 25, y: -25 },
                { x: 75, y: 25 },
                { x: 100, y: 0 }
            ];
            const buffer = ShapeBuffer.createBezier('bezier1', points, defaultStyles);
            
            expect(buffer.byteLength).toBe(56);
            expect(ShapeBuffer.readType(buffer)).toBe(ShapeType.BEZIER);
            
            const view = new DataView(buffer);
            for (let i = 0; i < 4; i++) {
                expect(view.getFloat32(24 + i * 8, true)).toBe(points[i].x);
                expect(view.getFloat32(28 + i * 8, true)).toBe(points[i].y);
            }
        });

        it('should handle color parsing correctly', () => {
            const styles: StyleData = {
                ...defaultStyles,
                strokeColor: '#123',
                fillColor: '#456789'
            };
            
            const buffer = ShapeBuffer.createRectangle('rect1', 0, 0, 10, 10, styles);
            
            expect(ShapeBuffer.readColor(buffer, 8)).toBe('#112233'); // #123 expanded
            expect(ShapeBuffer.readColor(buffer, 12)).toBe('#456789');
        });

        it('should pack and unpack flags correctly', () => {
            const dotted: StyleData = {
                ...defaultStyles,
                fillMode: 'both',
                strokeStyle: 'dotted'
            };
            
            const buffer = ShapeBuffer.createRectangle('rect1', 0, 0, 10, 10, dotted);
            const flags = ShapeBuffer.readFlags(buffer);
            
            expect(flags.fillMode).toBe(2); // BOTH
            expect(flags.strokeStyle).toBe(1); // DOTTED
        });
    });

    describe('BinaryShapeWrapper', () => {
        it('should provide object-like access to rectangle data', () => {
            const buffer = ShapeBuffer.createRectangle('rect1', 10, 20, 100, 50, defaultStyles);
            const wrapper = new BinaryShapeWrapper(buffer, 'rect1');
            
            expect(wrapper.id).toBe('rect1');
            expect(wrapper.type).toBe('rectangle');
            expect(wrapper.x).toBe(10);
            expect(wrapper.y).toBe(20);
            expect(wrapper.width).toBe(100);
            expect(wrapper.height).toBe(50);
            expect(wrapper.strokeColor).toBe('#ff0000');
            expect(wrapper.fillColor).toBe('#00ff00');
            expect(wrapper.strokeWidth).toBe(2);
            expect(wrapper.fillMode).toBe('stroke');
            expect(wrapper.strokeStyle).toBe('solid');
        });

        it('should allow property mutations', () => {
            const buffer = ShapeBuffer.createRectangle('rect1', 10, 20, 100, 50, defaultStyles);
            const wrapper = new BinaryShapeWrapper(buffer, 'rect1');
            
            wrapper.x = 30;
            wrapper.y = 40;
            wrapper.width = 200;
            wrapper.height = 100;
            wrapper.strokeColor = '#0000ff';
            wrapper.fillMode = 'both';
            wrapper.strokeStyle = 'dotted';
            wrapper.strokeWidth = 5;
            
            expect(wrapper.x).toBe(30);
            expect(wrapper.y).toBe(40);
            expect(wrapper.width).toBe(200);
            expect(wrapper.height).toBe(100);
            expect(wrapper.strokeColor).toBe('#0000ff');
            expect(wrapper.fillMode).toBe('both');
            expect(wrapper.strokeStyle).toBe('dotted');
            expect(wrapper.strokeWidth).toBe(5);
        });

        it('should handle line properties correctly', () => {
            const buffer = ShapeBuffer.createLine('line1', 0, 0, 100, 100, defaultStyles);
            const wrapper = new BinaryShapeWrapper(buffer, 'line1');
            
            expect(wrapper.type).toBe('line');
            expect(wrapper.x1).toBe(0);
            expect(wrapper.y1).toBe(0);
            expect(wrapper.x2).toBe(100);
            expect(wrapper.y2).toBe(100);
            
            wrapper.x2 = 200;
            wrapper.y2 = 200;
            
            expect(wrapper.x2).toBe(200);
            expect(wrapper.y2).toBe(200);
        });

        it('should handle circle properties correctly', () => {
            const buffer = ShapeBuffer.createCircle('circle1', 50, 50, 25, defaultStyles);
            const wrapper = new BinaryShapeWrapper(buffer, 'circle1');
            
            expect(wrapper.type).toBe('circle');
            expect(wrapper.x).toBe(50);
            expect(wrapper.y).toBe(50);
            expect(wrapper.radius).toBe(25);
            
            wrapper.radius = 50;
            expect(wrapper.radius).toBe(50);
        });

        it('should handle bezier points correctly', () => {
            const points = [
                { x: 0, y: 0 },
                { x: 25, y: -25 },
                { x: 75, y: 25 },
                { x: 100, y: 0 }
            ];
            const buffer = ShapeBuffer.createBezier('bezier1', points, defaultStyles);
            const wrapper = new BinaryShapeWrapper(buffer, 'bezier1');
            
            expect(wrapper.type).toBe('bezier');
            expect(wrapper.points).toEqual(points);
            
            const newPoints = [
                { x: 10, y: 10 },
                { x: 35, y: -15 },
                { x: 85, y: 35 },
                { x: 110, y: 10 }
            ];
            wrapper.points = newPoints;
            expect(wrapper.points).toEqual(newPoints);
        });

        it('should support legacy color property', () => {
            const buffer = ShapeBuffer.createRectangle('rect1', 0, 0, 10, 10, defaultStyles);
            const wrapper = new BinaryShapeWrapper(buffer, 'rect1');
            
            expect(wrapper.color).toBe('#ff0000'); // maps to strokeColor
            
            wrapper.color = '#00ff00';
            expect(wrapper.strokeColor).toBe('#00ff00');
            expect(wrapper.color).toBe('#00ff00');
        });
    });

    describe('BinaryShapeArray', () => {
        it('should behave like a normal array', () => {
            const array = new BinaryShapeArray();
            
            const rect1Buffer = ShapeBuffer.createRectangle('rect1', 0, 0, 10, 10, defaultStyles);
            const rect1 = new BinaryShapeWrapper(rect1Buffer, 'rect1');
            
            const rect2Buffer = ShapeBuffer.createRectangle('rect2', 20, 20, 15, 15, defaultStyles);
            const rect2 = new BinaryShapeWrapper(rect2Buffer, 'rect2');
            
            expect(array.length).toBe(0);
            
            array.push(rect1);
            expect(array.length).toBe(1);
            expect(array[0]).toBe(rect1);
            
            array.push(rect2);
            expect(array.length).toBe(2);
            expect(array[1]).toBe(rect2);
            
            const popped = array.pop();
            expect(popped).toBe(rect2);
            expect(array.length).toBe(1);
        });

        it('should provide shape lookup by ID', () => {
            const array = new BinaryShapeArray();
            
            const rect1Buffer = ShapeBuffer.createRectangle('rect1', 0, 0, 10, 10, defaultStyles);
            const rect1 = new BinaryShapeWrapper(rect1Buffer, 'rect1');
            
            const rect2Buffer = ShapeBuffer.createRectangle('rect2', 20, 20, 15, 15, defaultStyles);
            const rect2 = new BinaryShapeWrapper(rect2Buffer, 'rect2');
            
            array.push(rect1, rect2);
            
            expect(array.getById('rect1')).toBe(rect1);
            expect(array.getById('rect2')).toBe(rect2);
            expect(array.getById('nonexistent')).toBeUndefined();
        });

        it('should remove shapes by ID', () => {
            const array = new BinaryShapeArray();
            
            const rect1Buffer = ShapeBuffer.createRectangle('rect1', 0, 0, 10, 10, defaultStyles);
            const rect1 = new BinaryShapeWrapper(rect1Buffer, 'rect1');
            
            const rect2Buffer = ShapeBuffer.createRectangle('rect2', 20, 20, 15, 15, defaultStyles);
            const rect2 = new BinaryShapeWrapper(rect2Buffer, 'rect2');
            
            array.push(rect1, rect2);
            expect(array.length).toBe(2);
            
            const removed = array.removeById('rect1');
            expect(removed).toBe(true);
            expect(array.length).toBe(1);
            expect(array[0]).toBe(rect2);
            
            const notRemoved = array.removeById('nonexistent');
            expect(notRemoved).toBe(false);
            expect(array.length).toBe(1);
        });

        it('should provide memory statistics', () => {
            const array = new BinaryShapeArray();
            
            const rect1Buffer = ShapeBuffer.createRectangle('rect1', 0, 0, 10, 10, defaultStyles);
            const rect1 = new BinaryShapeWrapper(rect1Buffer, 'rect1');
            
            const rect2Buffer = ShapeBuffer.createRectangle('rect2', 20, 20, 15, 15, defaultStyles);
            const rect2 = new BinaryShapeWrapper(rect2Buffer, 'rect2');
            
            array.push(rect1, rect2);
            
            const stats = array.getMemoryStats();
            expect(stats.shapeCount).toBe(2);
            expect(stats.totalBytes).toBe(80); // 2 rectangles × 40 bytes each
            expect(stats.averageSize).toBe(40);
        });

        it('should clear all shapes', () => {
            const array = new BinaryShapeArray();
            
            const rect1Buffer = ShapeBuffer.createRectangle('rect1', 0, 0, 10, 10, defaultStyles);
            const rect1 = new BinaryShapeWrapper(rect1Buffer, 'rect1');
            
            array.push(rect1);
            expect(array.length).toBe(1);
            
            array.clear();
            expect(array.length).toBe(0);
            
            const stats = array.getMemoryStats();
            expect(stats.totalBytes).toBe(0);
        });

        it('should provide spatial region queries', () => {
            const array = new BinaryShapeArray();
            
            // Rectangle at (0, 0, 10, 10)
            const rect1Buffer = ShapeBuffer.createRectangle('rect1', 0, 0, 10, 10, defaultStyles);
            const rect1 = new BinaryShapeWrapper(rect1Buffer, 'rect1');
            
            // Rectangle at (20, 20, 10, 10)
            const rect2Buffer = ShapeBuffer.createRectangle('rect2', 20, 20, 10, 10, defaultStyles);
            const rect2 = new BinaryShapeWrapper(rect2Buffer, 'rect2');
            
            // Circle at (5, 5) with radius 3
            const circleBuffer = ShapeBuffer.createCircle('circle1', 5, 5, 3, defaultStyles);
            const circle = new BinaryShapeWrapper(circleBuffer, 'circle1');
            
            array.push(rect1, rect2, circle);
            
            // Query region (0, 0, 15, 15) should include rect1 and circle, but not rect2
            const results = array.getInRegion(0, 0, 15, 15);
            const resultIds = results.map(s => s.id).sort();
            expect(resultIds).toEqual(['circle1', 'rect1']);
            
            // Query region (15, 15, 20, 20) should include only rect2
            const results2 = array.getInRegion(15, 15, 20, 20);
            expect(results2.length).toBe(1);
            expect(results2[0].id).toBe('rect2');
        });
    });
});
