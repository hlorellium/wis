import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryManager, AddShapeCommand } from '../src/history';
import { CommandExecutor } from '../src/commandExecutor';
import { createStateProxy } from '../src/stateProxy';

describe('History with Sync', () => {
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

        // Setup history to only record local commands (like in main.ts)
        executor.subscribe((command, source) => {
            if (source === 'local') {
                history.record(command);
            }
        });
    });

    it('should only record local commands in history', () => {
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

        // Check that only local command is in history
        const historySize = history.getHistorySize();
        expect(historySize.past).toBe(1);
        expect(historySize.future).toBe(0);

        // Verify undo only affects local command
        const undoResult = history.undo(state);
        expect(undoResult).toBe(true);

        // Shape from local command should be gone, remote shape should remain
        expect(state.scene.shapes).toHaveLength(1);
        expect(state.scene.shapes[0].id).toBe('2'); // remote shape remains

        // Verify redo works for local command
        const redoResult = history.redo(state);
        expect(redoResult).toBe(true);

        // Both shapes should be back
        expect(state.scene.shapes).toHaveLength(2);
        expect(state.scene.shapes.some((s: any) => s.id === '1')).toBe(true);
        expect(state.scene.shapes.some((s: any) => s.id === '2')).toBe(true);
    });

    it('should not interfere with remote commands during undo/redo', () => {
        const localShape = { id: 'local', type: 'line' as const, x1: 0, y1: 0, x2: 10, y2: 10, color: '#000' };
        const remoteShape = { id: 'remote', type: 'line' as const, x1: 5, y1: 5, x2: 15, y2: 15, color: '#000' };

        // Execute local then remote
        executor.execute(new AddShapeCommand(localShape), state, 'local');
        executor.execute(new AddShapeCommand(remoteShape), state, 'remote');

        expect(state.scene.shapes).toHaveLength(2);

        // Undo should only affect local command
        history.undo(state);
        expect(state.scene.shapes).toHaveLength(1);
        expect(state.scene.shapes[0].id).toBe('remote');

        // Add another remote command while local is undone
        const remoteShape2 = { id: 'remote2', type: 'line' as const, x1: 20, y1: 20, x2: 30, y2: 30, color: '#000' };
        executor.execute(new AddShapeCommand(remoteShape2), state, 'remote');

        expect(state.scene.shapes).toHaveLength(2);
        expect(state.scene.shapes.some((s: any) => s.id === 'remote')).toBe(true);
        expect(state.scene.shapes.some((s: any) => s.id === 'remote2')).toBe(true);

        // Redo local command should not affect remote commands
        history.redo(state);
        expect(state.scene.shapes).toHaveLength(3);
        expect(state.scene.shapes.some((s: any) => s.id === 'local')).toBe(true);
        expect(state.scene.shapes.some((s: any) => s.id === 'remote')).toBe(true);
        expect(state.scene.shapes.some((s: any) => s.id === 'remote2')).toBe(true);
    });
});
