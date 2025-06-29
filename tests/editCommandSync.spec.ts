import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncManager } from '../src/sync/syncManager';
import { CommandExecutor } from '../src/commandExecutor';
import { MoveVertexCommand, MoveShapesCommand } from '../src/commands';
import { HistoryManager } from '../src/history';
import { initialState } from '../src/state';
// Import to register command factories
import '../src/sync/commandRegistry';

// Mock BroadcastChannel
const mockPostMessage = vi.fn();
const mockClose = vi.fn();

// Store original BroadcastChannel to restore later
const originalBroadcastChannel = globalThis.BroadcastChannel;

describe('Edit Command Synchronization', () => {
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
        state = { 
            ...initialState,
            scene: {
                shapes: [
                    {
                        id: 'test-shape',
                        type: 'rectangle' as const,
                        color: '#ff0000',
                        x: 10,
                        y: 10,
                        width: 20,
                        height: 20
                    },
                    {
                        id: 'test-line',
                        type: 'line' as const,
                        color: '#00ff00',
                        x1: 0,
                        y1: 0,
                        x2: 10,
                        y2: 10
                    }
                ]
            }
        };
        syncManager = new SyncManager(executor, state, history, 'test-channel');
    });

    afterEach(() => {
        // Restore original BroadcastChannel
        globalThis.BroadcastChannel = originalBroadcastChannel;
        syncManager?.destroy();
    });

    it('should broadcast MoveVertexCommand when executed locally', () => {
        const command = new MoveVertexCommand(
            'test-line',
            0,
            { x: 0, y: 0 },
            { x: 5, y: 5 }
        );
        
        // Execute as local command
        executor.execute(command, state, 'local');

        // Verify that postMessage was called
        expect(mockPostMessage).toHaveBeenCalledTimes(1);
        
        const sentMessage = mockPostMessage.mock.calls[0][0];
        expect(sentMessage.type).toBe('command');
        expect(sentMessage.command.type).toBe('MoveVertexCommand');
        expect(sentMessage.command.data.shapeId).toBe('test-line');
        expect(sentMessage.command.data.vertexIndex).toBe(0);
        expect(sentMessage.command.data.oldPos).toEqual({ x: 0, y: 0 });
        expect(sentMessage.command.data.newPos).toEqual({ x: 5, y: 5 });
    });

    it('should broadcast MoveShapesCommand when executed locally', () => {
        const command = new MoveShapesCommand(['test-shape'], 10, 20);
        
        // Execute as local command
        executor.execute(command, state, 'local');

        // Verify that postMessage was called
        expect(mockPostMessage).toHaveBeenCalledTimes(1);
        
        const sentMessage = mockPostMessage.mock.calls[0][0];
        expect(sentMessage.type).toBe('command');
        expect(sentMessage.command.type).toBe('MoveShapesCommand');
        expect(sentMessage.command.data.shapeIds).toEqual(['test-shape']);
        expect(sentMessage.command.data.dx).toBe(10);
        expect(sentMessage.command.data.dy).toBe(20);
    });

    it('should not broadcast MoveVertexCommand when executed as remote', () => {
        const command = new MoveVertexCommand(
            'test-line',
            0,
            { x: 0, y: 0 },
            { x: 5, y: 5 }
        );
        
        // Execute as remote command
        executor.execute(command, state, 'remote');

        // Verify that postMessage was not called for remote commands
        expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should not broadcast MoveShapesCommand when executed as remote', () => {
        const command = new MoveShapesCommand(['test-shape'], 10, 20);
        
        // Execute as remote command
        executor.execute(command, state, 'remote');

        // Verify that postMessage was not called for remote commands
        expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should handle incoming MoveVertexCommand from another tab', () => {
        const originalPos = { x: state.scene.shapes[1].x1, y: state.scene.shapes[1].y1 };
        
        // Simulate receiving a command from another tab
        const serializedCommand = {
            type: 'MoveVertexCommand',
            data: {
                shapeId: 'test-line',
                vertexIndex: 0,
                oldPos: { x: 0, y: 0 },
                newPos: { x: 15, y: 25 },
                id: 'remote-command-1',
                timestamp: Date.now()
            },
            id: 'remote-command-1',
            timestamp: Date.now()
        };

        // Simulate receiving the message
        const mockChannel = (BroadcastChannel as any).mock.results[0].value;
        if (mockChannel.onmessage) {
            mockChannel.onmessage({
                data: {
                    type: 'command',
                    command: serializedCommand
                }
            });
        }

        // Verify the shape was updated
        const updatedLine = state.scene.shapes.find((s: any) => s.id === 'test-line');
        expect(updatedLine.x1).toBe(15);
        expect(updatedLine.y1).toBe(25);
    });

    it('should handle incoming MoveShapesCommand from another tab', () => {
        const originalShape = { ...state.scene.shapes[0] };
        
        // Simulate receiving a command from another tab
        const serializedCommand = {
            type: 'MoveShapesCommand',
            data: {
                shapeIds: ['test-shape'],
                dx: 30,
                dy: 40,
                id: 'remote-command-2',
                timestamp: Date.now()
            },
            id: 'remote-command-2',
            timestamp: Date.now()
        };

        // Simulate receiving the message
        const mockChannel = (BroadcastChannel as any).mock.results[0].value;
        if (mockChannel.onmessage) {
            mockChannel.onmessage({
                data: {
                    type: 'command',
                    command: serializedCommand
                }
            });
        }

        // Verify the shape was moved
        const updatedShape = state.scene.shapes.find((s: any) => s.id === 'test-shape');
        expect(updatedShape.x).toBe(originalShape.x + 30);
        expect(updatedShape.y).toBe(originalShape.y + 40);
    });
});
