import { describe, it, expect } from 'vitest';
import {
  getBoundingBox,
  rectContainsRect,
  rectIntersectsRect,
  lineIntersectsRect,
  bezierIntersectsRect,
  type BoundingBox
} from '../src/utils/geometry';
import { createRectangle, createCircle, createLine, createBezierCurve } from './factories/shapeFactory';

describe('Geometry Utilities', () => {
  describe('getBoundingBox', () => {
    describe('Rectangle shapes', () => {
      it('should return correct bounding box for positive coordinates', () => {
        const rectangle = createRectangle({ x: 10, y: 20, width: 30, height: 40 });
        const bbox = getBoundingBox(rectangle);
        
        expect(bbox).toEqual({
          x: 10,
          y: 20,
          width: 30,
          height: 40
        });
      });

      it('should handle zero dimensions', () => {
        const rectangle = createRectangle({ x: 5, y: 5, width: 0, height: 0 });
        const bbox = getBoundingBox(rectangle);
        
        expect(bbox).toEqual({
          x: 5,
          y: 5,
          width: 0,
          height: 0
        });
      });

      it('should handle negative coordinates', () => {
        const rectangle = createRectangle({ x: -10, y: -20, width: 15, height: 25 });
        const bbox = getBoundingBox(rectangle);
        
        expect(bbox).toEqual({
          x: -10,
          y: -20,
          width: 15,
          height: 25
        });
      });
    });

    describe('Circle shapes', () => {
      it('should return correct bounding box for positive coordinates', () => {
        const circle = createCircle({ x: 50, y: 60, radius: 20 });
        const bbox = getBoundingBox(circle);
        
        expect(bbox).toEqual({
          x: 30, // 50 - 20
          y: 40, // 60 - 20
          width: 40, // 20 * 2
          height: 40 // 20 * 2
        });
      });

      it('should handle zero radius', () => {
        const circle = createCircle({ x: 10, y: 10, radius: 0 });
        const bbox = getBoundingBox(circle);
        
        expect(bbox).toEqual({
          x: 10,
          y: 10,
          width: 0,
          height: 0
        });
      });

      it('should handle negative coordinates', () => {
        const circle = createCircle({ x: -5, y: -10, radius: 3 });
        const bbox = getBoundingBox(circle);
        
        expect(bbox).toEqual({
          x: -8, // -5 - 3
          y: -13, // -10 - 3
          width: 6, // 3 * 2
          height: 6 // 3 * 2
        });
      });

      it('should handle large radius', () => {
        const circle = createCircle({ x: 0, y: 0, radius: 1000 });
        const bbox = getBoundingBox(circle);
        
        expect(bbox).toEqual({
          x: -1000,
          y: -1000,
          width: 2000,
          height: 2000
        });
      });
    });

    describe('Line shapes', () => {
      it('should return correct bounding box for horizontal line', () => {
        const line = createLine({ x1: 10, y1: 20, x2: 50, y2: 20 });
        const bbox = getBoundingBox(line);
        
        expect(bbox).toEqual({
          x: 10,
          y: 20,
          width: 40, // 50 - 10
          height: 0 // 20 - 20
        });
      });

      it('should return correct bounding box for vertical line', () => {
        const line = createLine({ x1: 10, y1: 5, x2: 10, y2: 25 });
        const bbox = getBoundingBox(line);
        
        expect(bbox).toEqual({
          x: 10,
          y: 5,
          width: 0, // 10 - 10
          height: 20 // 25 - 5
        });
      });

      it('should handle reversed coordinates (x2 < x1, y2 < y1)', () => {
        const line = createLine({ x1: 30, y1: 40, x2: 10, y2: 20 });
        const bbox = getBoundingBox(line);
        
        expect(bbox).toEqual({
          x: 10, // min(30, 10)
          y: 20, // min(40, 20)
          width: 20, // 30 - 10
          height: 20 // 40 - 20
        });
      });

      it('should handle point (zero-length line)', () => {
        const line = createLine({ x1: 15, y1: 25, x2: 15, y2: 25 });
        const bbox = getBoundingBox(line);
        
        expect(bbox).toEqual({
          x: 15,
          y: 25,
          width: 0,
          height: 0
        });
      });

      it('should handle negative coordinates', () => {
        const line = createLine({ x1: -10, y1: -5, x2: -20, y2: -15 });
        const bbox = getBoundingBox(line);
        
        expect(bbox).toEqual({
          x: -20, // min(-10, -20)
          y: -15, // min(-5, -15)
          width: 10, // -10 - (-20)
          height: 10 // -5 - (-15)
        });
      });
    });

    describe('Bezier curve shapes', () => {
      it('should return correct bounding box for simple bezier', () => {
        const bezier = createBezierCurve({
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 20 },
            { x: 30, y: 10 },
            { x: 40, y: 30 }
          ]
        });
        const bbox = getBoundingBox(bezier);
        
        expect(bbox).toEqual({
          x: 0, // min x
          y: 0, // min y
          width: 40, // 40 - 0
          height: 30 // 30 - 0
        });
      });

      it('should handle single point bezier', () => {
        const bezier = createBezierCurve({
          points: [{ x: 5, y: 10 }]
        });
        const bbox = getBoundingBox(bezier);
        
        expect(bbox).toEqual({
          x: 5,
          y: 10,
          width: 0,
          height: 0
        });
      });

      it('should handle negative coordinates', () => {
        const bezier = createBezierCurve({
          points: [
            { x: -5, y: -10 },
            { x: 5, y: -20 },
            { x: -15, y: 0 }
          ]
        });
        const bbox = getBoundingBox(bezier);
        
        expect(bbox).toEqual({
          x: -15, // min(-5, 5, -15)
          y: -20, // min(-10, -20, 0)
          width: 20, // 5 - (-15)
          height: 20 // 0 - (-20)
        });
      });

      it('should handle large coordinate values', () => {
        const bezier = createBezierCurve({
          points: [
            { x: 1000, y: 2000 },
            { x: 3000, y: 1500 },
            { x: 2000, y: 3000 }
          ]
        });
        const bbox = getBoundingBox(bezier);
        
        expect(bbox).toEqual({
          x: 1000,
          y: 1500,
          width: 2000, // 3000 - 1000
          height: 1500 // 3000 - 1500
        });
      });
    });

    describe('Unknown shape types', () => {
      it('should return zero bounding box for unknown shape type', () => {
        const unknownShape = { type: 'unknown' } as any;
        const bbox = getBoundingBox(unknownShape);
        
        expect(bbox).toEqual({
          x: 0,
          y: 0,
          width: 0,
          height: 0
        });
      });
    });
  });

  describe('rectContainsRect', () => {
    const outerRect: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };

    it('should return true when inner rect is fully contained', () => {
      const innerRect: BoundingBox = { x: 10, y: 10, width: 20, height: 20 };
      expect(rectContainsRect(innerRect, outerRect)).toBe(true);
    });

    it('should return true when inner rect is at the edge', () => {
      const innerRect: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
      expect(rectContainsRect(innerRect, outerRect)).toBe(true);
    });

    it('should return false when inner rect extends beyond left edge', () => {
      const innerRect: BoundingBox = { x: -5, y: 10, width: 20, height: 20 };
      expect(rectContainsRect(innerRect, outerRect)).toBe(false);
    });

    it('should return false when inner rect extends beyond right edge', () => {
      const innerRect: BoundingBox = { x: 90, y: 10, width: 20, height: 20 };
      expect(rectContainsRect(innerRect, outerRect)).toBe(false);
    });

    it('should return false when inner rect extends beyond top edge', () => {
      const innerRect: BoundingBox = { x: 10, y: -5, width: 20, height: 20 };
      expect(rectContainsRect(innerRect, outerRect)).toBe(false);
    });

    it('should return false when inner rect extends beyond bottom edge', () => {
      const innerRect: BoundingBox = { x: 10, y: 90, width: 20, height: 20 };
      expect(rectContainsRect(innerRect, outerRect)).toBe(false);
    });

    it('should handle zero-size inner rect', () => {
      const innerRect: BoundingBox = { x: 50, y: 50, width: 0, height: 0 };
      expect(rectContainsRect(innerRect, outerRect)).toBe(true);
    });

    it('should handle zero-size outer rect', () => {
      const zeroRect: BoundingBox = { x: 50, y: 50, width: 0, height: 0 };
      const innerRect: BoundingBox = { x: 50, y: 50, width: 0, height: 0 };
      expect(rectContainsRect(innerRect, zeroRect)).toBe(true);
    });

    it('should handle negative coordinates', () => {
      const outerNegative: BoundingBox = { x: -50, y: -50, width: 100, height: 100 };
      const innerNegative: BoundingBox = { x: -30, y: -30, width: 20, height: 20 };
      expect(rectContainsRect(innerNegative, outerNegative)).toBe(true);
    });
  });

  describe('rectIntersectsRect', () => {
    const rectA: BoundingBox = { x: 0, y: 0, width: 50, height: 50 };

    it('should return true for overlapping rectangles', () => {
      const rectB: BoundingBox = { x: 25, y: 25, width: 50, height: 50 };
      expect(rectIntersectsRect(rectA, rectB)).toBe(true);
      expect(rectIntersectsRect(rectB, rectA)).toBe(true);
    });

    it('should return true when rectangles are identical', () => {
      const rectB: BoundingBox = { x: 0, y: 0, width: 50, height: 50 };
      expect(rectIntersectsRect(rectA, rectB)).toBe(true);
    });

    it('should return true when one rectangle contains the other', () => {
      const smallRect: BoundingBox = { x: 10, y: 10, width: 20, height: 20 };
      expect(rectIntersectsRect(rectA, smallRect)).toBe(true);
      expect(rectIntersectsRect(smallRect, rectA)).toBe(true);
    });

    it('should return true when rectangles touch at edges', () => {
      const touchingRect: BoundingBox = { x: 50, y: 0, width: 30, height: 50 };
      expect(rectIntersectsRect(rectA, touchingRect)).toBe(true); // Note: touching edges count as intersection in this implementation
    });

    it('should return false for completely separate rectangles', () => {
      const separateRect: BoundingBox = { x: 100, y: 100, width: 50, height: 50 };
      expect(rectIntersectsRect(rectA, separateRect)).toBe(false);
      expect(rectIntersectsRect(separateRect, rectA)).toBe(false);
    });

    it('should return false when rectangles are horizontally separated', () => {
      const horizontalSeparate: BoundingBox = { x: 60, y: 0, width: 30, height: 50 };
      expect(rectIntersectsRect(rectA, horizontalSeparate)).toBe(false);
    });

    it('should return false when rectangles are vertically separated', () => {
      const verticalSeparate: BoundingBox = { x: 0, y: 60, width: 50, height: 30 };
      expect(rectIntersectsRect(rectA, verticalSeparate)).toBe(false);
    });

    it('should handle zero-size rectangles', () => {
      const zeroRect: BoundingBox = { x: 25, y: 25, width: 0, height: 0 };
      expect(rectIntersectsRect(rectA, zeroRect)).toBe(true);
    });

    it('should handle negative coordinates', () => {
      const negativeRect: BoundingBox = { x: -25, y: -25, width: 50, height: 50 };
      expect(rectIntersectsRect(rectA, negativeRect)).toBe(true);
    });
  });

  describe('lineIntersectsRect', () => {
    const rect: BoundingBox = { x: 10, y: 10, width: 40, height: 30 };

    it('should return true when line endpoint is inside rectangle', () => {
      const line = createLine({ x1: 0, y1: 0, x2: 20, y2: 20 });
      expect(lineIntersectsRect(line, rect)).toBe(true);
    });

    it('should return true when both line endpoints are inside rectangle', () => {
      const line = createLine({ x1: 15, y1: 15, x2: 45, y2: 35 });
      expect(lineIntersectsRect(line, rect)).toBe(true);
    });

    it('should return true when line crosses rectangle horizontally', () => {
      const line = createLine({ x1: 0, y1: 25, x2: 60, y2: 25 });
      expect(lineIntersectsRect(line, rect)).toBe(true);
    });

    it('should return true when line crosses rectangle vertically', () => {
      const line = createLine({ x1: 25, y1: 0, x2: 25, y2: 50 });
      expect(lineIntersectsRect(line, rect)).toBe(true);
    });

    it('should return true when line crosses rectangle diagonally', () => {
      const line = createLine({ x1: 0, y1: 0, x2: 60, y2: 50 });
      expect(lineIntersectsRect(line, rect)).toBe(true);
    });

    it('should return false when line is completely outside rectangle', () => {
      const line = createLine({ x1: 0, y1: 0, x2: 5, y2: 5 });
      expect(lineIntersectsRect(line, rect)).toBe(false);
    });

    it('should return false when line passes by rectangle without intersecting', () => {
      const line = createLine({ x1: 0, y1: 5, x2: 60, y2: 5 });
      expect(lineIntersectsRect(line, rect)).toBe(false);
    });

    it('should handle horizontal line at rectangle edge', () => {
      const line = createLine({ x1: 5, y1: 10, x2: 55, y2: 10 });
      expect(lineIntersectsRect(line, rect)).toBe(true);
    });

    it('should handle vertical line at rectangle edge', () => {
      const line = createLine({ x1: 10, y1: 5, x2: 10, y2: 45 });
      expect(lineIntersectsRect(line, rect)).toBe(true);
    });

    it('should handle zero-length line (point)', () => {
      const pointInside = createLine({ x1: 25, y1: 25, x2: 25, y2: 25 });
      expect(lineIntersectsRect(pointInside, rect)).toBe(true);

      const pointOutside = createLine({ x1: 5, y1: 5, x2: 5, y2: 5 });
      expect(lineIntersectsRect(pointOutside, rect)).toBe(false);
    });

    it('should respect tolerance parameter', () => {
      const line = createLine({ x1: 0, y1: 25, x2: 8, y2: 25 });
      expect(lineIntersectsRect(line, rect, 0)).toBe(false);
      expect(lineIntersectsRect(line, rect, 5)).toBe(false); // Still outside even with tolerance
    });

    it('should handle negative coordinates', () => {
      const negativeRect: BoundingBox = { x: -30, y: -20, width: 40, height: 30 };
      const line = createLine({ x1: -40, y1: -5, x2: 20, y2: -5 });
      expect(lineIntersectsRect(line, negativeRect)).toBe(true);
    });
  });

  describe('bezierIntersectsRect', () => {
    const rect: BoundingBox = { x: 20, y: 20, width: 40, height: 30 };

    it('should return true when bezier bounding box overlaps rectangle', () => {
      const bezier = createBezierCurve({
        points: [
          { x: 10, y: 10 },
          { x: 30, y: 25 },
          { x: 50, y: 35 },
          { x: 70, y: 60 }
        ]
      });
      expect(bezierIntersectsRect(bezier, rect)).toBe(true);
    });

    it('should return false when bezier bounding box does not overlap rectangle', () => {
      const bezier = createBezierCurve({
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 5 },
          { x: 10, y: 10 },
          { x: 15, y: 15 }
        ]
      });
      expect(bezierIntersectsRect(bezier, rect)).toBe(false);
    });

    it('should return true when bezier is completely inside rectangle', () => {
      const bezier = createBezierCurve({
        points: [
          { x: 25, y: 25 },
          { x: 30, y: 30 },
          { x: 35, y: 35 },
          { x: 40, y: 40 }
        ]
      });
      expect(bezierIntersectsRect(bezier, rect)).toBe(true);
    });

    it('should return true when rectangle is completely inside bezier bounding box', () => {
      const largeBezier = createBezierCurve({
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
          { x: 200, y: 50 },
          { x: 300, y: 150 }
        ]
      });
      expect(bezierIntersectsRect(largeBezier, rect)).toBe(true);
    });

    it('should handle single point bezier', () => {
      const pointBezier = createBezierCurve({
        points: [{ x: 30, y: 30 }]
      });
      expect(bezierIntersectsRect(pointBezier, rect)).toBe(true);

      const outsidePointBezier = createBezierCurve({
        points: [{ x: 5, y: 5 }]
      });
      expect(bezierIntersectsRect(outsidePointBezier, rect)).toBe(false);
    });

    it('should handle bezier with negative coordinates', () => {
      const negativeBezier = createBezierCurve({
        points: [
          { x: -10, y: -10 },
          { x: 25, y: 25 },
          { x: 35, y: 35 }
        ]
      });
      expect(bezierIntersectsRect(negativeBezier, rect)).toBe(true);
    });

    it('should handle edge case where bezier just touches rectangle', () => {
      const touchingBezier = createBezierCurve({
        points: [
          { x: 20, y: 20 }, // Exactly at rectangle corner
          { x: 25, y: 25 },
          { x: 30, y: 30 }
        ]
      });
      expect(bezierIntersectsRect(touchingBezier, rect)).toBe(true);
    });
  });
});
