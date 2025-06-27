import { describe, it, expect, beforeEach } from "vitest";
import {
  HistoryManager,
  AddShapeCommand,
  RemoveShapeCommand,
  PanCommand,
} from "../src/history";
import { resetIdCounter } from "../src/constants";
import type { State } from "../src/state";
import {
  createTestState,
  createTestRectangle,
  createTestCircle,
} from "./helpers";

describe("HistoryManager", () => {
  let state: State;
  let history: HistoryManager;

  beforeEach(() => {
    resetIdCounter();
    state = createTestState();
    history = new HistoryManager(5); // Small capacity for testing
  });

  describe("basic operations", () => {
    it("should start with no undo/redo capability", () => {
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
    });

    it("should handle push/undo/redo cycle correctly", () => {
      const shape = createTestRectangle();
      const addCommand = new AddShapeCommand(shape);

      // Push command
      history.push(addCommand, state);

      expect(state.scene.shapes).toHaveLength(1);
      expect(state.scene.shapes[0]).toEqual(shape);
      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);

      // Undo
      const undoResult = history.undo(state);
      expect(undoResult).toBe(true);
      expect(state.scene.shapes).toHaveLength(0);
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(true);

      // Redo
      const redoResult = history.redo(state);
      expect(redoResult).toBe(true);
      expect(state.scene.shapes).toHaveLength(1);
      expect(state.scene.shapes[0]).toEqual(shape);
      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);
    });

    it("should return false when trying to undo/redo with empty stacks", () => {
      expect(history.undo(state)).toBe(false);
      expect(history.redo(state)).toBe(false);
    });

    it("should clear redo stack when new command is pushed", () => {
      const shape1 = createTestRectangle();
      const shape2 = createTestCircle();

      history.push(new AddShapeCommand(shape1), state);
      history.undo(state);

      expect(history.canRedo()).toBe(true);

      // Push new command should clear redo stack
      history.push(new AddShapeCommand(shape2), state);
      expect(history.canRedo()).toBe(false);
    });
  });

  describe("command types", () => {
    it("should handle AddShapeCommand correctly", () => {
      const shape = createTestRectangle();
      const command = new AddShapeCommand(shape);

      command.apply(state);
      expect(state.scene.shapes).toContain(shape);

      command.invert(state);
      expect(state.scene.shapes).not.toContain(shape);
    });

    it("should handle RemoveShapeCommand correctly", () => {
      const shape = createTestRectangle();
      state.scene.shapes.push(shape);

      const command = new RemoveShapeCommand(shape);

      command.apply(state);
      expect(state.scene.shapes).not.toContain(shape);

      command.invert(state);
      expect(state.scene.shapes).toContain(shape);
    });

    it("should handle PanCommand correctly", () => {
      const command = new PanCommand(10, 5);

      expect(state.view.panX).toBe(0);
      expect(state.view.panY).toBe(0);

      command.apply(state);
      expect(state.view.panX).toBe(10);
      expect(state.view.panY).toBe(5);

      command.invert(state);
      expect(state.view.panX).toBe(0);
      expect(state.view.panY).toBe(0);
    });
  });

  describe("PanCommand merging", () => {
    it("should merge consecutive PanCommands", () => {
      const pan1 = new PanCommand(10, 5);
      const pan2 = new PanCommand(5, 3);

      // Add first pan command
      history.push(pan1, state);
      expect(state.view.panX).toBe(10);
      expect(state.view.panY).toBe(5);

      // Add second pan command (should merge)
      history.push(pan2, state);
      expect(state.view.panX).toBe(15);
      expect(state.view.panY).toBe(8);

      const histSize = history.getHistorySize();
      expect(histSize.past).toBe(1); // Should have only one command due to merging

      // Test undo merged command
      history.undo(state);
      expect(state.view.panX).toBe(0);
      expect(state.view.panY).toBe(0);
    });

    it("should not merge PanCommand with other command types", () => {
      const panCommand = new PanCommand(10, 5);
      const shapeCommand = new AddShapeCommand(createTestRectangle());

      history.push(panCommand, state);
      history.push(shapeCommand, state);

      const histSize = history.getHistorySize();
      expect(histSize.past).toBe(2); // Should have two separate commands
    });

    it("should create correct merged PanCommand", () => {
      const pan1 = new PanCommand(10, 5);
      const pan2 = new PanCommand(-3, 7);

      const merged = pan1.merge(pan2);
      expect(merged).toBeInstanceOf(PanCommand);

      if (merged) {
        merged.apply(state);
        expect(state.view.panX).toBe(7); // 10 + (-3)
        expect(state.view.panY).toBe(12); // 5 + 7
      }
    });
  });

  describe("capacity management", () => {
    it("should respect capacity limit", () => {
      const capacity = 3;
      const limitedHistory = new HistoryManager(capacity);
      const testState = createTestState();

      // Add more commands than capacity
      for (let i = 0; i < 5; i++) {
        const shape = createTestRectangle({ x: i * 10 });
        const command = new AddShapeCommand(shape);
        limitedHistory.push(command, testState);
      }

      const histSize = limitedHistory.getHistorySize();
      expect(histSize.past).toBeLessThanOrEqual(capacity);
      expect(testState.scene.shapes).toHaveLength(5); // All shapes should still be in scene
    });

    it("should maintain functionality after hitting capacity", () => {
      const capacity = 2;
      const limitedHistory = new HistoryManager(capacity);
      const testState = createTestState();

      // Fill beyond capacity
      for (let i = 0; i < 4; i++) {
        const shape = createTestRectangle({ x: i * 10 });
        limitedHistory.push(new AddShapeCommand(shape), testState);
      }

      // Should still be able to undo available commands
      expect(limitedHistory.canUndo()).toBe(true);
      limitedHistory.undo(testState);
      expect(testState.scene.shapes).toHaveLength(3);

      limitedHistory.undo(testState);
      expect(testState.scene.shapes).toHaveLength(2);

      // Should not be able to undo further (capacity limit)
      expect(limitedHistory.canUndo()).toBe(false);
    });
  });

  describe("utility methods", () => {
    it("should provide accurate history size information", () => {
      expect(history.getHistorySize()).toEqual({ past: 0, future: 0 });

      const shape = createTestRectangle();
      history.push(new AddShapeCommand(shape), state);
      expect(history.getHistorySize()).toEqual({ past: 1, future: 0 });

      history.undo(state);
      expect(history.getHistorySize()).toEqual({ past: 0, future: 1 });
    });

    it("should clear history completely", () => {
      const shape = createTestRectangle();
      history.push(new AddShapeCommand(shape), state);
      history.undo(state);

      expect(history.getHistorySize()).toEqual({ past: 0, future: 1 });

      history.clear();
      expect(history.getHistorySize()).toEqual({ past: 0, future: 0 });
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
    });
  });
});
