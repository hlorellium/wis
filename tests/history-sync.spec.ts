import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryManager, AddShapeCommand, UndoCommand, RedoCommand } from '../src/history';
import { CommandExecutor } from '../src/commandExecutor';
import { createStateProxy } from '../src/stateProxy';

describe('History with Synchronized Undo/Redo', () => {
    let history: HistoryManager;
    let executor: CommandExecutor;
    let state: any;

    beforeEach(() => {
        history = new HistoryManager();
        executor = new CommandExecutor();
        
        // Create fresh state with empty shapes
        const emptyState = {
            scene: { shapes: [] },
            view: { panX: 0, panY: 0, zoom: 1 },
            tool: 'pan' as const,
            currentDrawing: { shape: null, type: null },
            selection: null
        };
        
        state = createStateProxy(emptyState, () => {}, {
            raf: false,
            versioning: true,
            shallow: false
        });

        // Setup history to record ALL commands (like in main.ts with global history)
        executor.subscribe((command, source) => {
            history.record(command, source);
        });

        // Connect history manager to executor for undo/redo handling
        executor.setHistoryManager(history);

        // Setup history to broadcast undo/redo operations (but disable broadcast in tests)
        history.setUndoRedoCallback((undoRedoCommand) => {
            // In real app this would broadcast, but in tests we'll simulate manually
        });
    });

    it('should record both local and remote commands in global history', () => {
        const shape1 = { id: '1', type: 'line' as const, x1: 0, y1: 0, x2: 10, y2: 10, color: '#000' };
        const shape2 = { id: '2', type: 'line' as const, x1: 5, y1: 5, x2: 15, y2: 15, color: '#000' };

        const localCommand = new AddShapeCommand(shape1);
        const remoteCommand = new AddShapeCommand(shape2);

        // Execute local command
        executor.execute(localCommand, state, 'local');

        // Execute remote command
        executor.execute(remoteCommand, state, 'remote');

        // Check that both shapes are in state
        expect(state.scene.shapes).toHaveLength(2);
        expect(state.scene.shapes[0].id).toBe('1');
        expect(state.scene.shapes[1].id).toBe('2');

        // Check that BOTH commands are in history (global history)
        const historySize = history.getHistorySize();
        expect(historySize.past).toBe(2);
        expect(historySize.future).toBe(0);

        // Verify undo affects the most recent command (shape2)
        const undoResult = history.undo(state, false); // disable broadcast in test
        expect(undoResult).toBe(true);

        // Most recent shape should be gone
        expect(state.scene.shapes).toHaveLength(1);
        expect(state.scene.shapes[0].id).toBe('1'); // first shape remains

        // Verify redo works
        const redoResult = history.redo(state, false); // disable broadcast in test
        expect(redoResult).toBe(true);

        // Both shapes should be back
        expect(state.scene.shapes).toHaveLength(2);
        expect(state.scene.shapes.some((s: any) => s.id === '1')).toBe(true);
        expect(state.scene.shapes.some((s: any) => s.id === '2')).toBe(true);
    });

    it('should handle remote undo/redo commands properly', () => {
        const shape1 = { id: 'shape1', type: 'line' as const, x1: 0, y1: 0, x2: 10, y2: 10, color: '#000' };
        const shape2 = { id: 'shape2', type: 'line' as const, x1: 5, y1: 5, x2: 15, y2: 15, color: '#000' };

        const command1 = new AddShapeCommand(shape1);
        const command2 = new AddShapeCommand(shape2);

        // Execute commands
        executor.execute(command1, state, 'local');
        executor.execute(command2, state, 'local');

        expect(state.scene.shapes).toHaveLength(2);
        expect(history.getHistorySize().past).toBe(2);

        // Simulate receiving a remote undo command
        const remoteUndoCommand = new UndoCommand(command2.id);
        executor.execute(remoteUndoCommand, state, 'remote');

        // Should undo the most recent command
        expect(state.scene.shapes).toHaveLength(1);
        expect(state.scene.shapes[0].id).toBe('shape1');
        expect(history.getHistorySize().past).toBe(1);
        expect(history.getHistorySize().future).toBe(1);

        // Simulate receiving a remote redo command
        const remoteRedoCommand = new RedoCommand(command2.id);
        executor.execute(remoteRedoCommand, state, 'remote');

        // Should redo the command
        expect(state.scene.shapes).toHaveLength(2);
        expect(state.scene.shapes.some((s: any) => s.id === 'shape1')).toBe(true);
        expect(state.scene.shapes.some((s: any) => s.id === 'shape2')).toBe(true);
        expect(history.getHistorySize().past).toBe(2);
        expect(history.getHistorySize().future).toBe(0);
    });

    it('should prevent duplicate command execution with command IDs', () => {
        const shape = { id: 'shape1', type: 'line' as const, x1: 0, y1: 0, x2: 10, y2: 10, color: '#000' };
        const command = new AddShapeCommand(shape);

        // Execute the same command multiple times (simulating sync duplicate)
        executor.execute(command, state, 'local');
        executor.execute(command, state, 'remote'); // Should be ignored due to same ID
        executor.execute(command, state, 'local'); // Should be ignored due to same ID

        // Should only have one shape and one history entry
        expect(state.scene.shapes).toHaveLength(1);
        expect(history.getHistorySize().past).toBe(1);
    });
});
