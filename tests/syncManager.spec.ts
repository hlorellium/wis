import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SyncManager } from '../src/sync/syncManager';
import { CommandExecutor } from '../src/commandExecutor';
import { AddShapeCommand, PanCommand, HistoryManager } from '../src/history';
import { initialState } from '../src/state';
// Import to register command factories
import '../src/sync/commandRegistry';

// Mock BroadcastChannel specifically for this test
const mockPostMessage = vi.fn();
const mockClose = vi.fn();

// Store original BroadcastChannel (from polyfill) to restore later
const originalBroadcastChannel = globalThis.BroadcastChannel;

describe('SyncManager', () => {
    let syncManager: SyncManager;
    let executor: CommandExecutor;
    let history: HistoryManager;
    let state: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Override BroadcastChannel for this test suite
        globalThis.BroadcastChannel = vi.fn().mockImplementation((name: string) => ({
            name,
            postMessage: mockPostMessage,
            onmessage: null,
            close: mockClose
        }));
        
        executor = new CommandExecutor();
        history = new HistoryManager();
        state = { ...initialState };
        syncManager = new SyncManager(executor, state, history, 'test-channel');
    });

    afterEach(() => {
        // Restore original BroadcastChannel
        globalThis.BroadcastChannel = originalBroadcastChannel;
        syncManager?.destroy();
    });

    it('should create a BroadcastChannel with the specified name', () => {
        expect(BroadcastChannel).toHaveBeenCalledWith('test-channel');
        expect(syncManager.getChannelName()).toBe('test-channel');
    });

    it('should broadcast local AddShape commands', () => {
        const shape = {
            id: 'test-shape',
            type: 'rectangle' as const,
            color: '#ff0000',
            x: 10,
            y: 10,
            width: 20,
            height: 20
        };

        const command = new AddShapeCommand(shape);
        
        // Execute a local command
        executor.execute(command, state, 'local');

        // Verify that postMessage was called
        expect(mockPostMessage).toHaveBeenCalledTimes(1);
        
        const sentMessage = mockPostMessage.mock.calls[0][0];
        expect(sentMessage.type).toBe('command');
        expect(sentMessage.command.type).toBe('AddShapeCommand');
        expect(sentMessage.command.data.shape).toEqual(shape);
    });

    it('should not broadcast PanCommands', () => {
        const command = new PanCommand(10, 10);
        
        // Execute a local pan command
        executor.execute(command, state, 'local');

        // Verify that postMessage was not called for pan commands
        expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should not broadcast remote commands', () => {
        const shape = {
            id: 'test-shape',
            type: 'rectangle' as const,
            color: '#ff0000',
            x: 10,
            y: 10,
            width: 20,
            height: 20
        };

        const command = new AddShapeCommand(shape);
        
        // Execute a remote command
        executor.execute(command, state, 'remote');

        // Verify that postMessage was not called for remote commands
        expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should clean up resources when destroyed', () => {
        syncManager.destroy();
        expect(mockClose).toHaveBeenCalled();
    });
});
