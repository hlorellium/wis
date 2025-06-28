import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncManager } from '../src/sync/syncManager';
import { CommandExecutor } from '../src/commandExecutor';
import { AddShapeCommand } from '../src/history';
import { initialState } from '../src/state';

// Mock BroadcastChannel
global.BroadcastChannel = vi.fn().mockImplementation((name: string) => ({
    name,
    postMessage: vi.fn(),
    onmessage: null,
    close: vi.fn()
}));

describe('SyncManager', () => {
    let syncManager: SyncManager;
    let executor: CommandExecutor;
    let state: any;
    let mockChannel: any;

    beforeEach(() => {
        executor = new CommandExecutor();
        state = { ...initialState };
        syncManager = new SyncManager(executor, state, 'test-channel');
        mockChannel = (BroadcastChannel as any).mock.results[0].value;
    });

    it('should create a BroadcastChannel with the specified name', () => {
        expect(BroadcastChannel).toHaveBeenCalledWith('test-channel');
        expect(syncManager.getChannelName()).toBe('test-channel');
    });

    it('should broadcast local commands', () => {
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
        expect(mockChannel.postMessage).toHaveBeenCalledTimes(1);
        
        const sentMessage = mockChannel.postMessage.mock.calls[0][0];
        expect(sentMessage.type).toBe('command');
        expect(sentMessage.command.type).toBe('AddShapeCommand');
        expect(sentMessage.command.data.shape).toEqual(shape);
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
        expect(mockChannel.postMessage).not.toHaveBeenCalled();
    });

    it('should clean up resources when destroyed', () => {
        syncManager.destroy();
        expect(mockChannel.close).toHaveBeenCalled();
    });
});
