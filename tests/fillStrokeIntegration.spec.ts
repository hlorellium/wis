import { describe, it, expect, beforeEach } from 'vitest';
import { createTestState } from './helpers';
import { DrawingTools } from '../src/tools/drawingTools';
import { CommandExecutor } from '../src/commandExecutor';
import { generateId } from '../src/state';
import type { State, RectangleShape, CircleShape, LineShape } from '../src/state';

// Mock canvas for DrawingTools
const mockCanvas = {
    width: 800,
    height: 600,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 })
} as HTMLCanvasElement;

describe('Fill/Stroke Style Integration', () => {
    let state: State;
    let executor: CommandExecutor;
    let drawingTools: DrawingTools;

    beforeEach(() => {
        state = createTestState();
        executor = new CommandExecutor();
        drawingTools = new DrawingTools(mockCanvas, executor);
        
        // Set up style properties for testing
        state.fillMode = 'both';
        state.strokeColor = '#ff0000';
        state.fillColor = '#00ff00';
        state.strokeStyle = 'dotted';
        state.strokeWidth = 3;
    });

    describe('New Shape Creation with Style Properties', () => {
        it('should create rectangles with fill/stroke properties', () => {
            state.tool = 'rectangle';
            
            // Start drawing
            const mouseDown = new MouseEvent('mousedown', { 
                clientX: 100, 
                clientY: 100, 
                button: 0 
            });
            drawingTools.handleMouseDown(mouseDown, state);
            
            // Verify current drawing shape has style properties
            expect(state.currentDrawing.shape).toBeTruthy();
            const rect = state.currentDrawing.shape as RectangleShape;
            expect(rect.fillMode).toBe('both');
            expect(rect.strokeColor).toBe('#ff0000');
            expect(rect.fillColor).toBe('#00ff00');
            expect(rect.strokeStyle).toBe('dotted');
            expect(rect.strokeWidth).toBe(3);
        });

        it('should create circles with fill/stroke properties', () => {
            state.tool = 'circle';
            
            const mouseDown = new MouseEvent('mousedown', { 
                clientX: 100, 
                clientY: 100, 
                button: 0 
            });
            drawingTools.handleMouseDown(mouseDown, state);
            
            const circle = state.currentDrawing.shape as CircleShape;
            expect(circle.fillMode).toBe('both');
            expect(circle.strokeColor).toBe('#ff0000');
            expect(circle.fillColor).toBe('#00ff00');
            expect(circle.strokeStyle).toBe('dotted');
            expect(circle.strokeWidth).toBe(3);
        });

        it('should create lines with stroke properties only (no fill)', () => {
            state.tool = 'line';
            
            const mouseDown = new MouseEvent('mousedown', { 
                clientX: 100, 
                clientY: 100, 
                button: 0 
            });
            drawingTools.handleMouseDown(mouseDown, state);
            
            const line = state.currentDrawing.shape as LineShape;
            expect(line.strokeColor).toBe('#ff0000');
            expect(line.strokeStyle).toBe('dotted');
            expect(line.strokeWidth).toBe(3);
            // Lines shouldn't have fill properties
            expect(line.fillMode).toBeUndefined();
            expect(line.fillColor).toBeUndefined();
        });
    });

    describe('Backwards Compatibility', () => {
        it('should handle legacy shapes without new properties', () => {
            // Create a legacy rectangle shape without new properties
            const legacyRect: RectangleShape = {
                id: generateId(),
                type: 'rectangle',
                color: '#ff0000',
                x: 10,
                y: 10,
                width: 50,
                height: 30
            };

            state.scene.shapes = [legacyRect];
            
            // Should still work without errors
            expect(legacyRect.fillMode).toBeUndefined();
            expect(legacyRect.strokeColor).toBeUndefined();
            expect(legacyRect.fillColor).toBeUndefined();
            expect(legacyRect.color).toBe('#ff0000'); // Original color should be preserved
        });
    });

    describe('Default Values', () => {
        it('should have correct default style values in state', () => {
            const defaultState = createTestState();
            expect(defaultState.fillMode).toBe('stroke');
            expect(defaultState.strokeColor).toBe('#000000');
            expect(defaultState.fillColor).toBe('#000000');
            expect(defaultState.strokeStyle).toBe('solid');
            expect(defaultState.strokeWidth).toBe(2);
        });
    });
});
