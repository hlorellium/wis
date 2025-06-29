/**
 * Factory functions for creating test shapes
 * Reduces boilerplate and provides consistent test data
 */

import { RectangleShape, LineShape, CircleShape, BezierCurveShape, generateId } from '../../src/state';

export type Point = { x: number; y: number };

export interface ShapeFactoryOptions {
  id?: string;
  color?: string;
}

export interface RectangleOptions extends ShapeFactoryOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface LineOptions extends ShapeFactoryOptions {
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

export interface CircleOptions extends ShapeFactoryOptions {
  x?: number;
  y?: number;
  radius?: number;
}

export interface BezierOptions extends ShapeFactoryOptions {
  points?: Point[];
}

/**
 * Create a rectangle shape with sensible defaults
 */
export function createRectangle(options: RectangleOptions = {}): RectangleShape {
  const {
    id = generateId(),
    x = 10,
    y = 10,
    width = 100,
    height = 50,
    color = '#000000'
  } = options;

  return {
    id,
    type: 'rectangle',
    x,
    y,
    width,
    height,
    color
  };
}

/**
 * Create a line shape with sensible defaults
 */
export function createLine(options: LineOptions = {}): LineShape {
  const {
    id = generateId(),
    x1 = 0,
    y1 = 0,
    x2 = 100,
    y2 = 50,
    color = '#000000'
  } = options;

  return {
    id,
    type: 'line',
    x1,
    y1,
    x2,
    y2,
    color
  };
}

/**
 * Create a circle shape with sensible defaults
 */
export function createCircle(options: CircleOptions = {}): CircleShape {
  const {
    id = generateId(),
    x = 50,
    y = 50,
    radius = 25,
    color = '#000000'
  } = options;

  return {
    id,
    type: 'circle',
    x,
    y,
    radius,
    color
  };
}

/**
 * Create a bezier curve with sensible defaults
 */
export function createBezierCurve(options: BezierOptions = {}): BezierCurveShape {
  const {
    id = generateId(),
    points = [
      { x: 0, y: 50 },    // start point
      { x: 25, y: 0 },    // control point 1
      { x: 75, y: 100 },  // control point 2
      { x: 100, y: 50 }   // end point
    ],
    color = '#000000'
  } = options;

  return {
    id,
    type: 'bezier',
    points,
    color
  };
}

/**
 * Create multiple shapes for testing bulk operations
 */
export function createShapeCollection() {
  return {
    rectangles: [
      createRectangle({ x: 10, y: 10, width: 50, height: 30 }),
      createRectangle({ x: 100, y: 20, width: 40, height: 60 }),
      createRectangle({ x: 200, y: 50, width: 80, height: 40 })
    ],
    lines: [
      createLine({ x1: 0, y1: 0, x2: 30, y2: 40 }),
      createLine({ x1: 100, y1: 100, x2: 160, y2: 100 })
    ],
    circles: [
      createCircle({ x: 50, y: 50, radius: 20 }),
      createCircle({ x: 150, y: 150, radius: 30 })
    ],
    beziers: [
      createBezierCurve(),
      createBezierCurve({ 
        points: [
          { x: 200, y: 200 },
          { x: 250, y: 150 },
          { x: 300, y: 250 },
          { x: 350, y: 200 }
        ]
      })
    ]
  };
}

/**
 * Create a simple test state with predefined shapes
 */
export function createTestState() {
  const shapes = createShapeCollection();
  return {
    scene: {
      shapes: [
        ...shapes.rectangles,
        ...shapes.lines,
        ...shapes.circles,
        ...shapes.beziers
      ]
    },
    view: {
      panX: 0,
      panY: 0,
      zoom: 1
    },
    tool: 'select' as const,
    currentColor: '#000000',
    fillMode: 'stroke' as const,
    strokeColor: '#000000',
    fillColor: '#000000',
    strokeStyle: 'solid' as const,
    strokeWidth: 2,
    currentDrawing: {
      shape: null,
      type: null
    },
    selection: [shapes.rectangles[1].id], // Select second rectangle
    currentEditing: {
      shapeId: null,
      vertexIndex: null,
      isDragging: false,
      isGroupMove: false,
      dragStart: null,
      previewShapes: null,
      originalShapes: null
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
 * Utility to create point arrays for bezier testing
 */
export function createPointArray(count: number, spacing: number = 50): Point[] {
  return Array.from({ length: count }, (_, i) => ({
    x: i * spacing,
    y: Math.sin(i * 0.5) * 20 + 50  // Sine wave pattern
  }));
}

/**
 * Create overlapping rectangles for selection testing
 */
export function createOverlappingRectangles(): RectangleShape[] {
  return [
    createRectangle({ x: 0, y: 0, width: 100, height: 100 }),
    createRectangle({ x: 50, y: 50, width: 100, height: 100 }),
    createRectangle({ x: 25, y: 25, width: 50, height: 50 })
  ];
}
