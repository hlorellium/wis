import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShapeRenderer } from '../src/rendering/shapes';
import type { State, LineShape, RectangleShape, CircleShape } from '../src/state';
import { createRectangle, createCircle, createLine, createTestState } from './factories/shapeFactory';

describe('ShapeRenderer', () => {
  let renderer: ShapeRenderer;
  let mockCtx: CanvasRenderingContext2D;
  let mockState: State;

  beforeEach(() => {
    renderer = new ShapeRenderer();
    
    // Mock canvas context with all required methods
    mockCtx = {
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      arc: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      setLineDash: vi.fn()
    } as any;

    // Create mock state
    mockState = createTestState();
    mockState.selection = [];
  });

  describe('renderShape', () => {
    it('should render a line shape', () => {
      const line = createLine({ 
        id: 'test-line',
        x1: 10, 
        y1: 20, 
        x2: 50, 
        y2: 60, 
        color: '#ff0000' 
      });

      renderer.renderShape(mockCtx, line, mockState);

      expect(mockCtx.strokeStyle).toBe('#ff0000');
      expect(mockCtx.lineWidth).toBe(2);
      expect(mockCtx.beginPath).toHaveBeenCalledOnce();
      expect(mockCtx.moveTo).toHaveBeenCalledWith(10, 20);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(50, 60);
      expect(mockCtx.stroke).toHaveBeenCalledOnce();
    });

    it('should render a rectangle shape', () => {
      const rect = createRectangle({ 
        id: 'test-rect',
        x: 10, 
        y: 20, 
        width: 100, 
        height: 50, 
        color: '#00ff00' 
      });

      renderer.renderShape(mockCtx, rect, mockState);

      expect(mockCtx.fillStyle).toBe('#00ff00');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(10, 20, 100, 50);
    });

    it('should render a circle shape', () => {
      const circle = createCircle({ 
        id: 'test-circle',
        x: 50, 
        y: 60, 
        radius: 30, 
        color: '#0000ff' 
      });

      renderer.renderShape(mockCtx, circle, mockState);

      expect(mockCtx.strokeStyle).toBe('#0000ff');
      expect(mockCtx.fillStyle).toBe('transparent');
      expect(mockCtx.lineWidth).toBe(2);
      expect(mockCtx.beginPath).toHaveBeenCalledOnce();
      expect(mockCtx.arc).toHaveBeenCalledWith(50, 60, 30, 0, Math.PI * 2);
      expect(mockCtx.stroke).toHaveBeenCalledOnce();
    });

    it('should render selection highlight for selected rectangle', () => {
      const rect = createRectangle({ 
        id: 'selected-rect',
        x: 10, 
        y: 20, 
        width: 100, 
        height: 50 
      });
      mockState.selection = ['selected-rect'];

      renderer.renderShape(mockCtx, rect, mockState);

      // Check that selection highlight was rendered
      expect(mockCtx.save).toHaveBeenCalledOnce();
      expect(mockCtx.strokeStyle).toBe('#ffaa00');
      expect(mockCtx.lineWidth).toBe(2);
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([3, 3]);
      expect(mockCtx.strokeRect).toHaveBeenCalledWith(8, 18, 104, 54); // rect with 2px padding
      expect(mockCtx.restore).toHaveBeenCalledOnce();
    });

    it('should render selection highlight for selected circle', () => {
      const circle = createCircle({ 
        id: 'selected-circle',
        x: 50, 
        y: 60, 
        radius: 30 
      });
      mockState.selection = ['selected-circle'];

      renderer.renderShape(mockCtx, circle, mockState);

      // Check that selection highlight was rendered
      expect(mockCtx.save).toHaveBeenCalledOnce();
      expect(mockCtx.strokeStyle).toBe('#ffaa00');
      expect(mockCtx.lineWidth).toBe(2);
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([3, 3]);
      expect(mockCtx.beginPath).toHaveBeenCalledTimes(2); // Once for shape, once for highlight
      expect(mockCtx.arc).toHaveBeenCalledWith(50, 60, 33, 0, Math.PI * 2); // radius + 3
      expect(mockCtx.restore).toHaveBeenCalledOnce();
    });

    it('should render selection highlight for selected line', () => {
      const line = createLine({ 
        id: 'selected-line',
        x1: 10, 
        y1: 20, 
        x2: 50, 
        y2: 60 
      });
      mockState.selection = ['selected-line'];

      renderer.renderShape(mockCtx, line, mockState);

      // Check that selection highlight was rendered
      expect(mockCtx.save).toHaveBeenCalledOnce();
      expect(mockCtx.strokeStyle).toBe('#ffaa00');
      expect(mockCtx.lineWidth).toBe(4); // Thicker for line highlight
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([3, 3]);
      expect(mockCtx.beginPath).toHaveBeenCalledTimes(2); // Once for shape, once for highlight
      expect(mockCtx.moveTo).toHaveBeenCalledWith(10, 20);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(50, 60);
      expect(mockCtx.restore).toHaveBeenCalledOnce();
    });

    it('should not render selection highlight for unselected shape', () => {
      const rect = createRectangle({ id: 'unselected-rect' });
      mockState.selection = ['other-shape-id'];

      renderer.renderShape(mockCtx, rect, mockState);

      // Should not call save/restore for selection highlight
      expect(mockCtx.save).not.toHaveBeenCalled();
      expect(mockCtx.restore).not.toHaveBeenCalled();
    });

    it('should work without state parameter', () => {
      const rect = createRectangle({ x: 5, y: 10, width: 50, height: 25 });

      renderer.renderShape(mockCtx, rect);

      expect(mockCtx.fillStyle).toBe('#000000'); // default color
      expect(mockCtx.fillRect).toHaveBeenCalledWith(5, 10, 50, 25);
      // Should not try to render selection highlight
      expect(mockCtx.save).not.toHaveBeenCalled();
    });
  });

  describe('renderLine', () => {
    it('should render line with correct properties', () => {
      const line: LineShape = {
        id: 'line1',
        type: 'line',
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 100,
        color: '#ff00ff'
      };

      renderer.renderLine(mockCtx, line);

      expect(mockCtx.strokeStyle).toBe('#ff00ff');
      expect(mockCtx.lineWidth).toBe(2);
      expect(mockCtx.beginPath).toHaveBeenCalledOnce();
      expect(mockCtx.moveTo).toHaveBeenCalledWith(0, 0);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(100, 100);
      expect(mockCtx.stroke).toHaveBeenCalledOnce();
    });

    it('should handle negative coordinates', () => {
      const line: LineShape = {
        id: 'line2',
        type: 'line',
        x1: -50,
        y1: -30,
        x2: -10,
        y2: -5,
        color: '#123456'
      };

      renderer.renderLine(mockCtx, line);

      expect(mockCtx.moveTo).toHaveBeenCalledWith(-50, -30);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(-10, -5);
    });
  });

  describe('renderRectangle', () => {
    it('should render rectangle with correct properties', () => {
      const rect: RectangleShape = {
        id: 'rect1',
        type: 'rectangle',
        x: 25,
        y: 35,
        width: 200,
        height: 150,
        color: '#abcdef'
      };

      renderer.renderRectangle(mockCtx, rect);

      expect(mockCtx.fillStyle).toBe('#abcdef');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(25, 35, 200, 150);
    });

    it('should handle zero dimensions', () => {
      const rect: RectangleShape = {
        id: 'rect2',
        type: 'rectangle',
        x: 10,
        y: 20,
        width: 0,
        height: 0,
        color: '#ffffff'
      };

      renderer.renderRectangle(mockCtx, rect);

      expect(mockCtx.fillRect).toHaveBeenCalledWith(10, 20, 0, 0);
    });
  });

  describe('renderCircle', () => {
    it('should render circle with correct properties', () => {
      const circle: CircleShape = {
        id: 'circle1',
        type: 'circle',
        x: 100,
        y: 150,
        radius: 75,
        color: '#654321'
      };

      renderer.renderCircle(mockCtx, circle);

      expect(mockCtx.strokeStyle).toBe('#654321');
      expect(mockCtx.fillStyle).toBe('transparent');
      expect(mockCtx.lineWidth).toBe(2);
      expect(mockCtx.beginPath).toHaveBeenCalledOnce();
      expect(mockCtx.arc).toHaveBeenCalledWith(100, 150, 75, 0, Math.PI * 2);
      expect(mockCtx.stroke).toHaveBeenCalledOnce();
    });

    it('should handle zero radius', () => {
      const circle: CircleShape = {
        id: 'circle2',
        type: 'circle',
        x: 50,
        y: 50,
        radius: 0,
        color: '#000000'
      };

      renderer.renderCircle(mockCtx, circle);

      expect(mockCtx.arc).toHaveBeenCalledWith(50, 50, 0, 0, Math.PI * 2);
    });
  });

  describe('renderPreview', () => {
    it('should render line preview with dashed style', () => {
      const line = createLine({ x1: 10, y1: 20, x2: 50, y2: 60 });

      renderer.renderPreview(mockCtx, line, 'line');

      expect(mockCtx.save).toHaveBeenCalledOnce();
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([5, 5]);
      expect(mockCtx.globalAlpha).toBe(0.6);
      expect(mockCtx.beginPath).toHaveBeenCalledOnce();
      expect(mockCtx.moveTo).toHaveBeenCalledWith(10, 20);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(50, 60);
      expect(mockCtx.stroke).toHaveBeenCalledOnce();
      expect(mockCtx.restore).toHaveBeenCalledOnce();
    });

    it('should render rectangle preview with dashed style', () => {
      const rect = createRectangle({ x: 5, y: 10, width: 50, height: 30 });

      renderer.renderPreview(mockCtx, rect, 'rectangle');

      expect(mockCtx.save).toHaveBeenCalledOnce();
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([5, 5]);
      expect(mockCtx.globalAlpha).toBe(0.6);
      expect(mockCtx.fillRect).toHaveBeenCalledWith(5, 10, 50, 30);
      expect(mockCtx.restore).toHaveBeenCalledOnce();
    });

    it('should render circle preview with dashed style', () => {
      const circle = createCircle({ x: 30, y: 40, radius: 25 });

      renderer.renderPreview(mockCtx, circle, 'circle');

      expect(mockCtx.save).toHaveBeenCalledOnce();
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([5, 5]);
      expect(mockCtx.globalAlpha).toBe(0.6);
      expect(mockCtx.beginPath).toHaveBeenCalledOnce();
      expect(mockCtx.arc).toHaveBeenCalledWith(30, 40, 25, 0, Math.PI * 2);
      expect(mockCtx.stroke).toHaveBeenCalledOnce();
      expect(mockCtx.restore).toHaveBeenCalledOnce();
    });

    it('should handle unknown preview type gracefully', () => {
      const shape = createRectangle();

      renderer.renderPreview(mockCtx, shape, 'unknown-type');

      expect(mockCtx.save).toHaveBeenCalledOnce();
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([5, 5]);
      expect(mockCtx.globalAlpha).toBe(0.6);
      expect(mockCtx.restore).toHaveBeenCalledOnce();
      // Should not call any rendering methods for unknown type
      expect(mockCtx.fillRect).not.toHaveBeenCalled();
      expect(mockCtx.stroke).not.toHaveBeenCalled();
    });
  });

  describe('edge cases and integration', () => {
    it('should handle multiple selections', () => {
      const rect1 = createRectangle({ id: 'rect1' });
      const rect2 = createRectangle({ id: 'rect2' });
      mockState.selection = ['rect1', 'rect2', 'rect3'];

      renderer.renderShape(mockCtx, rect1, mockState);
      vi.clearAllMocks();
      renderer.renderShape(mockCtx, rect2, mockState);

      // Both should render selection highlights
      expect(mockCtx.save).toHaveBeenCalledOnce();
      expect(mockCtx.restore).toHaveBeenCalledOnce();
    });

    it('should preserve context state between renders', () => {
      const line = createLine({ color: '#ff0000' });
      const rect = createRectangle({ color: '#00ff00' });

      renderer.renderShape(mockCtx, line, mockState);
      renderer.renderShape(mockCtx, rect, mockState);

      // Should set different colors for different shapes
      expect(mockCtx.strokeStyle).toBe('#ff0000');
      expect(mockCtx.fillStyle).toBe('#00ff00');
    });

    it('should handle extreme coordinate values', () => {
      const largeRect = createRectangle({
        x: 999999,
        y: -999999,
        width: 1000000,
        height: 1000000
      });

      expect(() => {
        renderer.renderShape(mockCtx, largeRect, mockState);
      }).not.toThrow();

      expect(mockCtx.fillRect).toHaveBeenCalledWith(999999, -999999, 1000000, 1000000);
    });
  });
});
