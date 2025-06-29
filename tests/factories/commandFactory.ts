/**
 * Factory functions for creating test commands
 * Reduces boilerplate and provides consistent command testing data
 */

import { 
  createRectangle, 
  createLine, 
  createCircle, 
  createBezierCurve,
  Point 
} from './shapeFactory';
import { MoveShapesCommand } from '../../src/commands/moveShapesCommand';
import { MoveVertexCommand } from '../../src/commands/moveVertexCommand';
import { DeleteShapeCommand } from '../../src/commands/deleteShapeCommand';
import type { Shape } from '../../src/state';

export interface MoveShapesOptions {
  shapeIds?: string[];
  deltaX?: number;
  deltaY?: number;
  id?: string;
}

export interface MoveVertexOptions {
  shapeId?: string;
  vertexIndex?: number;
  oldPosition?: Point;
  newPosition?: Point;
  id?: string;
}

export interface DeleteShapeOptions {
  shapeIds?: string[];
  id?: string;
}

/**
 * Create a MoveShapesCommand for testing
 */
export function createMoveShapesCommand(options: MoveShapesOptions = {}): MoveShapesCommand {
  const {
    shapeIds = ['test-shape-1'],
    deltaX = 10,
    deltaY = 15,
    id
  } = options;

  return new MoveShapesCommand(shapeIds, deltaX, deltaY, id);
}

/**
 * Create a MoveVertexCommand for testing
 */
export function createMoveVertexCommand(options: MoveVertexOptions = {}): MoveVertexCommand {
  const {
    shapeId = 'test-bezier-1',
    vertexIndex = 0,
    oldPosition = { x: 0, y: 50 },
    newPosition = { x: 50, y: 75 },
    id
  } = options;

  return new MoveVertexCommand(shapeId, vertexIndex, oldPosition, newPosition, id);
}

/**
 * Create a DeleteShapeCommand for testing
 */
export function createDeleteShapeCommand(options: DeleteShapeOptions = {}): DeleteShapeCommand {
  const {
    shapeIds = ['test-shape-1'],
    id
  } = options;

  return new DeleteShapeCommand(shapeIds, id);
}

/**
 * Create a collection of test commands for bulk testing
 */
export function createCommandCollection() {
  return {
    moveCommands: [
      createMoveShapesCommand({ 
        shapeIds: ['rect-1'], 
        deltaX: 5, 
        deltaY: 10
      }),
      createMoveShapesCommand({ 
        shapeIds: ['rect-1', 'rect-2'], 
        deltaX: -20, 
        deltaY: 30
      })
    ],
    vertexMoveCommands: [
      createMoveVertexCommand({
        shapeId: 'bezier-1',
        vertexIndex: 0,
        oldPosition: { x: 0, y: 50 },
        newPosition: { x: 10, y: 20 }
      }),
      createMoveVertexCommand({
        shapeId: 'bezier-1',
        vertexIndex: 1,
        oldPosition: { x: 25, y: 0 },
        newPosition: { x: 30, y: 5 }
      })
    ],
    deleteCommands: [
      createDeleteShapeCommand({ shapeIds: ['rect-1'] }),
      createDeleteShapeCommand({ shapeIds: ['bezier-1'] })
    ]
  };
}

/**
 * Create a command sequence for testing undo/redo chains
 */
export function createCommandSequence() {
  return [
    // Step 1: Move rectangle
    createMoveShapesCommand({
      shapeIds: ['seq-rect'],
      deltaX: 25,
      deltaY: 0
    }),
    // Step 2: Move both shapes
    createMoveShapesCommand({
      shapeIds: ['seq-rect', 'seq-circle'],
      deltaX: 0,
      deltaY: 50
    }),
    // Step 3: Delete circle
    createDeleteShapeCommand({
      shapeIds: ['seq-circle']
    })
  ];
}

/**
 * Create test data for command serialization testing
 */
export function createSerializationTestCommands() {
  return {
    simple: createMoveShapesCommand({
      shapeIds: ['simple-test'],
      deltaX: 1,
      deltaY: 1
    }),
    complex: createMoveVertexCommand({
      shapeId: 'complex-bezier',
      vertexIndex: 2,
      oldPosition: { x: 99.99, y: 11.11 },
      newPosition: { x: 123.456, y: 789.012 }
    })
  };
}

/**
 * Helper to create commands that would conflict (same shape, different operations)
 */
export function createConflictingCommands() {
  return {
    move1: createMoveShapesCommand({
      shapeIds: ['conflict-test'],
      deltaX: 10,
      deltaY: 0
    }),
    move2: createMoveShapesCommand({
      shapeIds: ['conflict-test'],
      deltaX: -5,
      deltaY: 20
    }),
    delete: createDeleteShapeCommand({
      shapeIds: ['conflict-test']
    })
  };
}
