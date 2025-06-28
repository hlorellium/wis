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
    private executedCommands = new Set<string>(); // Track executed command IDs

    /**
     * Set the history manager for handling undo/redo commands
     */
    setHistoryManager(historyManager: any): void {
        this.historyManager = historyManager;
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
}
