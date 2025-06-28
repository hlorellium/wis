import type { Command } from './commands';
import type { State } from './state';

export type CommandSource = 'local' | 'remote';

export type CommandListener = (command: Command, source: CommandSource) => void;

/**
 * Central command dispatcher that applies commands and notifies listeners.
 * This serves as the core coordination point for history, sync, and other features.
 */
export class CommandExecutor {
    private listeners = new Set<CommandListener>();

    /**
     * Execute a command and notify all listeners.
     * @param command The command to execute
     * @param state The state to apply the command to
     * @param source Whether this is a local or remote command
     */
    execute(command: Command, state: State, source: CommandSource = 'local'): void {
        // Apply the command to state
        command.apply(state);
        
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
