import type { State, RectangleShape, CircleShape, LineShape } from '../src/state';
import { generateId } from '../src/constants';

/**
 * Creates a clean test state with default values
 */
export function createTestState(): State {
  return {
    scene: { shapes: [] },
    view: { panX: 0, panY: 0, zoom: 1 },
    tool: 'pan' as const,
    currentDrawing: { shape: null, type: null },
    selection: null
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
