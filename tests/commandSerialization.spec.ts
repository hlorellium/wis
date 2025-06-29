/**
 * Command Serialization Tests
 * Uses snapshots to freeze the command protocol and detect breaking changes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MoveShapesCommand, MoveVertexCommand, DeleteShapeCommand } from '../src/commands';
import { CommandRegistry } from '../src/sync/commandRegistry';
import { createMoveShapesCommand, createMoveVertexCommand, createDeleteShapeCommand } from './factories/commandFactory';
import '../src/sync/commandRegistry'; // Ensure registry is populated

// Fixed timestamp for consistent snapshots
const FIXED_TIMESTAMP = 1700000000000;

describe('Command Serialization Protocol', () => {
  beforeEach(() => {
    // Mock Date.now to return fixed timestamp for consistent snapshots
    vi.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP);
  });

  describe('MoveShapesCommand', () => {
    it('should serialize consistently', () => {
      const command = createMoveShapesCommand({
        shapeIds: ['shape-1', 'shape-2'],
        deltaX: 25,
        deltaY: -10,
        id: 'test-move-shapes-123'
      });

      const serialized = CommandRegistry.serialize(command);
      
      expect(serialized).toMatchSnapshot('move-shapes-command');
    });

    it('should serialize with negative deltas', () => {
      const command = createMoveShapesCommand({
        shapeIds: ['negative-test'],
        deltaX: -100,
        deltaY: -50,
        id: 'negative-move-123'
      });

      const serialized = CommandRegistry.serialize(command);
      
      expect(serialized).toMatchSnapshot('move-shapes-negative');
    });

    it('should serialize with multiple shapes', () => {
      const command = createMoveShapesCommand({
        shapeIds: ['rect-1', 'rect-2', 'circle-1', 'bezier-1'],
        deltaX: 0,
        deltaY: 15,
        id: 'multi-shape-move'
      });

      const serialized = CommandRegistry.serialize(command);
      
      expect(serialized).toMatchSnapshot('move-shapes-multiple');
    });
  });

  describe('MoveVertexCommand', () => {
    it('should serialize consistently', () => {
      const command = createMoveVertexCommand({
        shapeId: 'bezier-test',
        vertexIndex: 2,
        oldPosition: { x: 100.5, y: 200.25 },
        newPosition: { x: 125.75, y: 175.5 },
        id: 'test-move-vertex-456'
      });

      const serialized = CommandRegistry.serialize(command);
      
      expect(serialized).toMatchSnapshot('move-vertex-command');
    });

    it('should serialize with fractional coordinates', () => {
      const command = createMoveVertexCommand({
        shapeId: 'precision-test',
        vertexIndex: 0,
        oldPosition: { x: 0.123456789, y: -0.987654321 },
        newPosition: { x: 999.999999, y: -1000.000001 },
        id: 'precision-vertex'
      });

      const serialized = CommandRegistry.serialize(command);
      
      expect(serialized).toMatchSnapshot('move-vertex-precision');
    });

    it('should serialize with different vertex indices', () => {
      const command = createMoveVertexCommand({
        shapeId: 'vertex-index-test',
        vertexIndex: 3,
        oldPosition: { x: 50, y: 60 },
        newPosition: { x: 70, y: 80 },
        id: 'vertex-index-test'
      });

      const serialized = CommandRegistry.serialize(command);
      
      expect(serialized).toMatchSnapshot('move-vertex-index-3');
    });
  });

  describe('DeleteShapeCommand', () => {
    it('should serialize consistently', () => {
      const command = createDeleteShapeCommand({
        shapeIds: ['delete-test-1'],
        id: 'test-delete-789'
      });

      const serialized = CommandRegistry.serialize(command);
      
      expect(serialized).toMatchSnapshot('delete-shape-command');
    });

    it('should serialize with multiple shapes', () => {
      const command = createDeleteShapeCommand({
        shapeIds: ['shape-a', 'shape-b', 'shape-c'],
        id: 'multi-delete-test'
      });

      const serialized = CommandRegistry.serialize(command);
      
      expect(serialized).toMatchSnapshot('delete-shapes-multiple');
    });
  });

  describe('Round-trip serialization', () => {
    it('should maintain command integrity through serialize/deserialize cycle', () => {
      const originalCommand = createMoveShapesCommand({
        shapeIds: ['roundtrip-test'],
        deltaX: 42,
        deltaY: -17,
        id: 'roundtrip-123'
      });

      // Serialize
      const serialized = CommandRegistry.serialize(originalCommand);
      
      // Deserialize
      const deserializedCommand = CommandRegistry.deserialize(serialized.type, serialized.data);
      
      // Re-serialize to compare
      const reseralized = CommandRegistry.serialize(deserializedCommand);
      
      expect(reseralized).toEqual(serialized);
    });

    it('should preserve vertex command precision', () => {
      const originalCommand = createMoveVertexCommand({
        shapeId: 'precision-roundtrip',
        vertexIndex: 1,
        oldPosition: { x: 3.14159265359, y: 2.71828182846 },
        newPosition: { x: 1.41421356237, y: 1.73205080757 },
        id: 'math-constants'
      });

      const serialized = CommandRegistry.serialize(originalCommand);
      const deserializedCommand = CommandRegistry.deserialize(serialized.type, serialized.data);
      const reseralized = CommandRegistry.serialize(deserializedCommand);
      
      expect(reseralized).toEqual(serialized);
    });
  });

  describe('Protocol versioning', () => {
    it('should include command type in serialization', () => {
      const command = createMoveShapesCommand({ id: 'type-test' });
      const serialized = CommandRegistry.serialize(command);
      
      expect(serialized.type).toBe('MoveShapesCommand');
      expect(typeof serialized.data).toBe('object');
    });

    it('should handle command IDs consistently', () => {
      const fixedId = 'consistent-id-test-12345';
      const command = createMoveVertexCommand({ id: fixedId });
      const serialized = CommandRegistry.serialize(command);
      
      expect(serialized.data.id).toBe(fixedId);
    });

    it('should preserve timestamp fields', () => {
      const command = createDeleteShapeCommand({ id: 'timestamp-test' });
      
      // Commands should have timestamps
      expect(command.timestamp).toBeTypeOf('number');
      expect(command.timestamp).toBeGreaterThan(0);
      
      const serialized = CommandRegistry.serialize(command);
      expect(serialized.data.timestamp).toBe(command.timestamp);
    });
  });
});
