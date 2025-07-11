import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandExecutor } from '../src/commandExecutor';
import { SyncManager } from '../src/sync/syncManager';
import { MoveVertexCommand, MoveShapesCommand } from '../src/commands';
import { HistoryManager } from '../src/history';
import { initialState } from '../src/state';
import { eventBus } from '../src/utils/eventBus';
import '../src/sync/commandRegistry';

describe('Bezier Curve Sync', () => {
    let executor: CommandExecutor;
    let syncManager: SyncManager;
    let history: HistoryManager;
    let state: any;
    let broadcastSpy: any;

    beforeEach(() => {
        executor = new CommandExecutor();
        history = new HistoryManager();
        state = {
            ...initialState,
            scene: {
                shapes: [
                    {
                        id: 'bezier-test',
                        type: 'bezier' as const,
                        color: '#ff00ff',
                        points: [
                            { x: 0, y: 0 },   // p0
                            { x: 10, y: 0 },  // cp1
                            { x: 20, y: 10 }, // cp2
                            { x: 30, y: 10 }  // p1
                        ]
                    }
                ]
            }
        };

        syncManager = new SyncManager(executor, state, history, 'test-channel');

        // Mock BroadcastChannel
        const mockChannel = {
            postMessage: vi.fn(),
            close: vi.fn(),
            name: 'test-channel'
        };
        broadcastSpy = vi.spyOn(mockChannel, 'postMessage');
        (syncManager as any).channel = mockChannel;
    });

    it('should sync bezier vertex movement', () => {
        // Move the first control point of the bezier curve
        const command = new MoveVertexCommand(
            'bezier-test',
            1, // cp1
            { x: 10, y: 0 },
            { x: 15, y: 5 }
        );

        executor.execute(command, state, 'local');

        // Verify command was broadcast
        expect(broadcastSpy).toHaveBeenCalled();
        const broadcastCall = broadcastSpy.mock.calls[0][0];
        expect(broadcastCall.type).toBe('command');
        expect(broadcastCall.command.type).toBe('MoveVertexCommand');
        expect(broadcastCall.command.data.shapeId).toBe('bezier-test');
        expect(broadcastCall.command.data.vertexIndex).toBe(1);

        // Verify the bezier curve was actually modified
        const bezierShape = state.scene.shapes[0];
        expect(bezierShape.points[1]).toEqual({ x: 15, y: 5 });
    });

    it('should sync bezier shape movement', () => {
        const command = new MoveShapesCommand(['bezier-test'], 10, 20);

        executor.execute(command, state, 'local');

        // Verify command was broadcast
        expect(broadcastSpy).toHaveBeenCalled();
        const broadcastCall = broadcastSpy.mock.calls[0][0];
        expect(broadcastCall.type).toBe('command');
        expect(broadcastCall.command.type).toBe('MoveShapesCommand');

        // Verify all bezier points were moved
        const bezierShape = state.scene.shapes[0];
        expect(bezierShape.points[0]).toEqual({ x: 10, y: 20 });
        expect(bezierShape.points[1]).toEqual({ x: 20, y: 20 });
        expect(bezierShape.points[2]).toEqual({ x: 30, y: 30 });
        expect(bezierShape.points[3]).toEqual({ x: 40, y: 30 });
    });

    it('should handle remote bezier commands', () => {
        const remoteData = {
            type: 'MoveVertexCommand',
            data: {
                shapeId: 'bezier-test',
                vertexIndex: 2,
                oldPos: { x: 20, y: 10 },
                newPos: { x: 25, y: 15 },
                id: 'remote-command',
                timestamp: Date.now()
            }
        };

        // Simulate receiving a command from another tab
        (syncManager as any).handleRemoteCommand(remoteData);

        // Verify the bezier curve was modified
        const bezierShape = state.scene.shapes[0];
        expect(bezierShape.points[2]).toEqual({ x: 25, y: 15 });
    });

    it('should emit command events for bezier curves when commands are executed', () => {
        const commandEvents: any[] = [];
        
        // Subscribe to command events
        const unsubscribe = eventBus.subscribe('commandExecuted', (event) => {
            commandEvents.push(event);
        });

        // Execute a vertex move command
        const vertexCommand = new MoveVertexCommand(
            'bezier-test',
            1,
            { x: 10, y: 0 },
            { x: 15, y: 5 }
        );
        
        executor.execute(vertexCommand, state, 'local');
        
        // Verify command event was emitted with correct metadata
        expect(commandEvents).toHaveLength(1);
        expect(commandEvents[0].affectedShapeIds).toContain('bezier-test');
        expect(commandEvents[0].sideEffects).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ type: 'cacheInvalidation', target: 'bezier-test' })
            ])
        );

        // Execute a shape move command
        commandEvents.length = 0;
        const shapeCommand = new MoveShapesCommand(['bezier-test'], 10, 20);
        
        executor.execute(shapeCommand, state, 'local');
        
        // Verify command event was emitted with correct metadata
        expect(commandEvents).toHaveLength(1);
        expect(commandEvents[0].affectedShapeIds).toContain('bezier-test');
        expect(commandEvents[0].sideEffects).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ type: 'cacheInvalidation', target: 'bezier-test' })
            ])
        );

        unsubscribe();
    });
});
