import type { State, RectangleShape, CircleShape, LineShape, BezierCurveShape } from '../src/state';
import { generateId } from '../src/constants';

/**
 * Creates a clean test state with default values
 */
export function createTestState(): State {
  return {
    scene: { shapes: [] },
    view: { panX: 0, panY: 0, zoom: 1 },
    tool: 'pan' as const,
    currentColor: '#000000',
    // Style defaults
    fillMode: 'stroke',
    strokeColor: '#000000',
    fillColor: '#000000',
    strokeStyle: 'solid',
    strokeWidth: 2,
    currentDrawing: { shape: null, type: null },
    selection: [],
    currentEditing: {
      shapeId: null,
      vertexIndex: null,
      isDragging: false,
      isGroupMove: false,
      dragStart: null
    },
    ui: {
      selectionDrag: {
        isActive: false,
        start: null,
        current: null
      }
    }
  };
}

/**
 * Creates a test rectangle shape with optional overrides
 */
export function createTestRectangle(overrides: Partial<RectangleShape> = {}): RectangleShape {
  return {
    id: generateId(),
    type: 'rectangle' as const,
    color: '#f00',
    x: 10,
    y: 10,
    width: 20,
    height: 20,
    ...overrides
  };
}

/**
 * Creates a test circle shape with optional overrides
 */
export function createTestCircle(overrides: Partial<CircleShape> = {}): CircleShape {
  return {
    id: generateId(),
    type: 'circle' as const,
    color: '#00f',
    x: 15,
    y: 15,
    radius: 10,
    ...overrides
  };
}

/**
 * Creates a test line shape with optional overrides
 */
export function createTestLine(overrides: Partial<LineShape> = {}): LineShape {
  return {
    id: generateId(),
    type: 'line' as const,
    color: '#0f0',
    x1: 0,
    y1: 0,
    x2: 50,
    y2: 50,
    ...overrides
  };
}

/**
 * Creates a test Bézier curve shape with optional overrides
 */
export function createTestBezierCurve(overrides: Partial<BezierCurveShape> = {}): BezierCurveShape {
  return {
    id: generateId(),
    type: 'bezier' as const,
    color: '#ff00ff',
    points: [
      { x: 10, y: 10 },  // p0
      { x: 20, y: 5 },   // cp1
      { x: 30, y: 25 },  // cp2
      { x: 40, y: 20 }   // p1
    ],
    ...overrides
  };
}
