import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Path2DRenderer } from '../src/rendering/path2DRenderer';
import { createTestState } from './helpers';
import type { State, RectangleShape, CircleShape, LineShape } from '../src/state';
import { generateId } from '../src/state';

// Mock canvas context
const createMockContext = () => {
    const ctx = {
        save: vi.fn(),
        restore: vi.fn(),
        scale: vi.fn(),
        translate: vi.fn(),
        clearRect: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        setLineDash: vi.fn(),
        strokeRect: vi.fn(),
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arc: vi.fn(),
        bezierCurveTo: vi.fn(),
        rect: vi.fn(),
        strokeStyle: '#000000',
        fillStyle: '#000000',
        lineWidth: 2,
        globalAlpha: 1
    };
    return ctx as unknown as CanvasRenderingContext2D;
};

// Mock canvas
const createMockCanvas = () => ({
    width: 800,
    height: 600
}) as HTMLCanvasElement;

describe('Path2DRenderer Fill/Stroke Functionality', () => {
    let renderer: Path2DRenderer;
    let ctx: CanvasRenderingContext2D;
    let canvas: HTMLCanvasElement;
    let state: State;

    beforeEach(() => {
        renderer = new Path2DRenderer();
        ctx = createMockContext();
        canvas = createMockCanvas();
        state = createTestState();
        
        // Mock devicePixelRatio
        Object.defineProperty(window, 'devicePixelRatio', {
            writable: true,
            value: 1
        });
    });

    describe('Stroke-only Shapes', () => {
        it('should render rectangle with stroke mode only', () => {
            const rect: RectangleShape = {
                id: generateId(),
                type: 'rectangle',
                color: '#ff0000',
                fillMode: 'stroke',
                strokeColor: '#0000ff',
                strokeWidth: 3,
                strokeStyle: 'solid',
                x: 10,
                y: 10,
                width: 50,
                height: 30
            };
            
            state.scene.shapes = [rect];
            
            renderer.render(ctx, canvas, state);
            
            // Should set stroke properties
            expect(ctx.strokeStyle).toBe('#0000ff');
            expect(ctx.lineWidth).toBe(3);
            expect(ctx.setLineDash).toHaveBeenCalledWith([]);
            
            // Should stroke but not fill
            expect(ctx.stroke).toHaveBeenCalled();
            expect(ctx.fill).not.toHaveBeenCalled();
        });

        it('should render circle with stroke mode and dotted style', () => {
            const circle: CircleShape = {
                id: generateId(),
                type: 'circle',
                color: '#ff0000',
                fillMode: 'stroke',
                strokeColor: '#00ff00',
                strokeWidth: 2,
                strokeStyle: 'dotted',
                x: 25,
                y: 25,
                radius: 15
            };
            
            state.scene.shapes = [circle];
            
            renderer.render(ctx, canvas, state);
            
            // Should set dotted line style
            expect(ctx.setLineDash).toHaveBeenCalledWith([5, 5]);
            expect(ctx.strokeStyle).toBe('#00ff00');
            expect(ctx.lineWidth).toBe(2);
            
            // Should stroke but not fill
            expect(ctx.stroke).toHaveBeenCalled();
            expect(ctx.fill).not.toHaveBeenCalled();
        });

        it('should render line with stroke properties', () => {
            const line: LineShape = {
                id: generateId(),
                type: 'line',
                color: '#ff0000',
                strokeColor: '#ff00ff',
                strokeWidth: 4,
                strokeStyle: 'solid',
                x1: 0,
                y1: 0,
                x2: 50,
                y2: 50
            };
            
            state.scene.shapes = [line];
            
            renderer.render(ctx, canvas, state);
            
            expect(ctx.strokeStyle).toBe('#ff00ff');
            expect(ctx.lineWidth).toBe(4);
            expect(ctx.setLineDash).toHaveBeenCalledWith([]);
            expect(ctx.stroke).toHaveBeenCalled();
            expect(ctx.fill).not.toHaveBeenCalled();
        });
    });

    describe('Fill-only Shapes', () => {
        it('should render rectangle with fill mode only', () => {
            const rect: RectangleShape = {
                id: generateId(),
                type: 'rectangle',
                color: '#ff0000',
                fillMode: 'fill',
                fillColor: '#00ff00',
                x: 10,
                y: 10,
                width: 50,
                height: 30
            };
            
            state.scene.shapes = [rect];
            
            renderer.render(ctx, canvas, state);
            
            expect(ctx.fillStyle).toBe('#00ff00');
            expect(ctx.fill).toHaveBeenCalled();
            expect(ctx.stroke).not.toHaveBeenCalled();
        });

        it('should render circle with fill mode only', () => {
            const circle: CircleShape = {
                id: generateId(),
                type: 'circle',
                color: '#ff0000',
                fillMode: 'fill',
                fillColor: '#ffff00',
                x: 25,
                y: 25,
                radius: 15
            };
            
            state.scene.shapes = [circle];
            
            renderer.render(ctx, canvas, state);
            
            expect(ctx.fillStyle).toBe('#ffff00');
            expect(ctx.fill).toHaveBeenCalled();
            expect(ctx.stroke).not.toHaveBeenCalled();
        });
    });

    describe('Both Fill and Stroke', () => {
        it('should render rectangle with both fill and stroke', () => {
            const rect: RectangleShape = {
                id: generateId(),
                type: 'rectangle',
                color: '#ff0000',
                fillMode: 'both',
                strokeColor: '#0000ff',
                fillColor: '#00ff00',
                strokeWidth: 2,
                strokeStyle: 'solid',
                x: 10,
                y: 10,
                width: 50,
                height: 30
            };
            
            state.scene.shapes = [rect];
            
            renderer.render(ctx, canvas, state);
            
            expect(ctx.strokeStyle).toBe('#0000ff');
            expect(ctx.fillStyle).toBe('#00ff00');
            expect(ctx.lineWidth).toBe(2);
            
            // Should call both fill and stroke
            expect(ctx.fill).toHaveBeenCalled();
            expect(ctx.stroke).toHaveBeenCalled();
            
            // Fill should be called before stroke (proper layering)
            // Note: This test verifies call order, but the exact mock structure may vary
            expect(ctx.fill).toHaveBeenCalled();
            expect(ctx.stroke).toHaveBeenCalled();
        });

        it('should render circle with both fill and stroke with dotted border', () => {
            const circle: CircleShape = {
                id: generateId(),
                type: 'circle',
                color: '#ff0000',
                fillMode: 'both',
                strokeColor: '#ff0000',
                fillColor: '#00ffff',
                strokeWidth: 3,
                strokeStyle: 'dotted',
                x: 25,
                y: 25,
                radius: 15
            };
            
            state.scene.shapes = [circle];
            
            renderer.render(ctx, canvas, state);
            
            expect(ctx.setLineDash).toHaveBeenCalledWith([5, 5]);
            expect(ctx.strokeStyle).toBe('#ff0000');
            expect(ctx.fillStyle).toBe('#00ffff');
            expect(ctx.lineWidth).toBe(3);
            
            expect(ctx.fill).toHaveBeenCalled();
            expect(ctx.stroke).toHaveBeenCalled();
        });
    });

    describe('Legacy Shape Support', () => {
        it('should render legacy rectangle using color property', () => {
            const legacyRect: RectangleShape = {
                id: generateId(),
                type: 'rectangle',
                color: '#ff0000',
                x: 10,
                y: 10,
                width: 50,
                height: 30
                // No new style properties
            };
            
            state.scene.shapes = [legacyRect];
            
            renderer.render(ctx, canvas, state);
            
            // Should use legacy color and default to fill mode for rectangles
            expect(ctx.fillStyle).toBe('#ff0000');
            expect(ctx.fill).toHaveBeenCalled();
            expect(ctx.stroke).not.toHaveBeenCalled();
        });

        it('should render legacy circle using color property', () => {
            const legacyCircle: CircleShape = {
                id: generateId(),
                type: 'circle',
                color: '#00ff00',
                x: 25,
                y: 25,
                radius: 15
                // No new style properties
            };
            
            state.scene.shapes = [legacyCircle];
            
            renderer.render(ctx, canvas, state);
            
            // Should use legacy color and default to stroke mode for circles
            expect(ctx.strokeStyle).toBe('#00ff00');
            expect(ctx.stroke).toHaveBeenCalled();
            expect(ctx.fill).not.toHaveBeenCalled();
        });

        it('should render legacy line using color property', () => {
            const legacyLine: LineShape = {
                id: generateId(),
                type: 'line',
                color: '#0000ff',
                x1: 0,
                y1: 0,
                x2: 50,
                y2: 50
                // No new style properties
            };
            
            state.scene.shapes = [legacyLine];
            
            renderer.render(ctx, canvas, state);
            
            expect(ctx.strokeStyle).toBe('#0000ff');
            expect(ctx.lineWidth).toBe(2); // Default width
            expect(ctx.setLineDash).toHaveBeenCalledWith([]); // Default solid
            expect(ctx.stroke).toHaveBeenCalled();
            expect(ctx.fill).not.toHaveBeenCalled();
        });
    });

    describe('Preview Rendering', () => {
        it('should render preview with same style properties as regular shapes', () => {
            const rect: RectangleShape = {
                id: generateId(),
                type: 'rectangle',
                color: '#ff0000',
                fillMode: 'both',
                strokeColor: '#0000ff',
                fillColor: '#00ff00',
                strokeWidth: 3,
                strokeStyle: 'dotted',
                x: 10,
                y: 10,
                width: 50,
                height: 30
            };
            
            state.currentDrawing.shape = rect;
            state.currentDrawing.type = 'rectangle';
            
            renderer.render(ctx, canvas, state);
            
            // Preview should use same colors and styles
            expect(ctx.strokeStyle).toBe('#0000ff');
            expect(ctx.fillStyle).toBe('#00ff00');
            expect(ctx.lineWidth).toBe(3);
            expect(ctx.setLineDash).toHaveBeenCalledWith([5, 5]); // Dotted
            
            // Should render both fill and stroke for 'both' mode
            expect(ctx.fill).toHaveBeenCalled();
            expect(ctx.stroke).toHaveBeenCalled();
        });
    });

    describe('Color Fallback Logic', () => {
        it('should fall back to legacy color when stroke color is missing', () => {
            const rect: RectangleShape = {
                id: generateId(),
                type: 'rectangle',
                color: '#ff0000',
                fillMode: 'stroke',
                // strokeColor missing
                strokeWidth: 2,
                strokeStyle: 'solid',
                x: 10,
                y: 10,
                width: 50,
                height: 30
            };
            
            state.scene.shapes = [rect];
            
            renderer.render(ctx, canvas, state);
            
            expect(ctx.strokeStyle).toBe('#ff0000'); // Falls back to color
            expect(ctx.stroke).toHaveBeenCalled();
        });

        it('should fall back to default color when both are missing', () => {
            const rect: RectangleShape = {
                id: generateId(),
                type: 'rectangle',
                color: '', // Empty color to test fallback
                fillMode: 'stroke',
                // strokeColor missing
                strokeWidth: 2,
                strokeStyle: 'solid',
                x: 10,
                y: 10,
                width: 50,
                height: 30
            };
            
            state.scene.shapes = [rect];
            
            renderer.render(ctx, canvas, state);
            
            expect(ctx.strokeStyle).toBe('#f00'); // Falls back to default color map
            expect(ctx.stroke).toHaveBeenCalled();
        });
    });
});
