import type { Command } from './commands';
import { UndoCommand, RedoCommand } from './commands';
import type { State } from './state';
import { logger } from './utils/logger';

export type CommandSource = 'local' | 'remote';

export type CommandListener = (command: Command, source: CommandSource) => void;

/**
 * Central command dispatcher that applies commands and notifies listeners.
 * This serves as the core coordination point for history, sync, and other features.
 */
export class CommandExecutor {
    private listeners = new Set<CommandListener>();
    private historyManager?: any; // Will be set by main.ts
    private renderer?: any; // Will be set by main.ts
    private executedCommands = new Set<string>(); // Track executed command IDs

    /**
     * Set the history manager for handling undo/redo commands
     */
    setHistoryManager(historyManager: any): void {
        this.historyManager = historyManager;
    }

    /**
     * Set the renderer for cache clearing when shapes are modified
     */
    setRenderer(renderer: any): void {
        this.renderer = renderer;
    }

    /**
     * Execute a command and notify all listeners.
     * @param command The command to execute
     * @param state The state to apply the command to
     * @param source Whether this is a local or remote command
     */
    execute(command: Command, state: State, source: CommandSource = 'local'): void {
        // Handle undo/redo commands specially
        if (command instanceof UndoCommand) {
            if (this.historyManager && !this.executedCommands.has(command.id)) {
                this.executedCommands.add(command.id);
                this.historyManager.handleRemoteUndo(command, state);
                // Notify listeners
                this.listeners.forEach(listener => listener(command, source));
            }
            return;
        } else if (command instanceof RedoCommand) {
            if (this.historyManager && !this.executedCommands.has(command.id)) {
                this.executedCommands.add(command.id);
                this.historyManager.handleRemoteRedo(command, state);
                // Notify listeners
                this.listeners.forEach(listener => listener(command, source));
            }
            return;
        }

        // For regular commands, check if already executed
        if (this.executedCommands.has(command.id)) {
            logger.info(`Skipping already executed command: ${command.constructor.name} (${command.id})`, 'CommandExecutor');
            return; // Skip already executed commands
        }

        logger.info(`Executing ${source} command: ${command.constructor.name} (${command.id})`, 'CommandExecutor');
        
        // Apply regular commands to state
        command.apply(state);
        this.executedCommands.add(command.id);
        
        // Clear renderer cache for affected shapes
        this.clearCacheForCommand(command);
        
        // Notify all listeners
        this.listeners.forEach(listener => listener(command, source));
    }

    /**
     * Subscribe to command executions.
     * @param listener Function to call when commands are executed
     * @returns Unsubscribe function
     */
    subscribe(listener: CommandListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Get the number of active listeners (useful for testing)
     */
    getListenerCount(): number {
        return this.listeners.size;
    }

    /**
     * Clear renderer cache for shapes affected by a command
     */
    private clearCacheForCommand(command: Command): void {
        if (!this.renderer || !this.renderer.clearCache) {
            return;
        }

        // Import the command types to check instanceof
        const { MoveShapesCommand, MoveVertexCommand, DeleteShapeCommand } = require('./commands');

        if (command instanceof MoveShapesCommand) {
            // Clear cache for all moved shapes
            const serialized = (command as any).serialize();
            serialized.shapeIds.forEach((shapeId: string) => {
                this.renderer.clearCache(shapeId);
                logger.info(`Cleared cache for moved shape: ${shapeId}`, 'CommandExecutor');
            });
        } else if (command instanceof MoveVertexCommand) {
            // Clear cache for the modified shape
            const serialized = (command as any).serialize();
            this.renderer.clearCache(serialized.shapeId);
            logger.info(`Cleared cache for vertex-modified shape: ${serialized.shapeId}`, 'CommandExecutor');
        } else if (command instanceof DeleteShapeCommand) {
            // Clear cache for deleted shapes
            const serialized = (command as any).serialize();
            serialized.shapeIds.forEach((shapeId: string) => {
                this.renderer.clearCache(shapeId);
                logger.info(`Cleared cache for deleted shape: ${shapeId}`, 'CommandExecutor');
            });
        } else {
            // For other commands (AddShape, etc.), clear all cache to be safe
            this.renderer.clearCache();
            logger.info(`Cleared all cache for command: ${command.constructor.name}`, 'CommandExecutor');
        }
    }
}
