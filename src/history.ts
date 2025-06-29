import type { State } from './state';
import { HISTORY_CONFIG } from './constants';
import type { Command } from './commands';
import { UndoCommand, RedoCommand } from './commands';
import { eventBus } from './utils/eventBus';

// Re-export commands for backward compatibility
export type { Command } from './commands';
export { AddShapeCommand, RemoveShapeCommand, PanCommand, UndoCommand, RedoCommand } from './commands';

interface CommandEntry {
    command: Command;
    source: 'local' | 'remote';
}

export class HistoryManager {
    private past: CommandEntry[] = [];
    private future: CommandEntry[] = [];
    private readonly maxSize: number;
    private appliedCommands = new Set<string>(); // Track applied command IDs to prevent duplicates
    private onUndoRedo?: (command: UndoCommand | RedoCommand) => void;

    constructor(maxSize: number = HISTORY_CONFIG.MAX_STACK_SIZE) {
        this.maxSize = maxSize;
    }

    /**
     * Set callback for when undo/redo operations should be broadcast
     */
    setUndoRedoCallback(callback: (command: UndoCommand | RedoCommand) => void): void {
        this.onUndoRedo = callback;
    }

    record(command: Command, source: 'local' | 'remote' = 'local'): void {
        // Skip if this command was already applied (prevent duplicates in sync)
        if (this.appliedCommands.has(command.id)) {
            return;
        }

        // Don't record undo/redo commands in history
        if (command instanceof UndoCommand || command instanceof RedoCommand) {
            this.appliedCommands.add(command.id);
            return;
        }

        // Record the command that has already been executed
        const entry: CommandEntry = { command, source };
        this.past.push(entry);
        this.appliedCommands.add(command.id);
        
        // Enforce capacity limit
        if (this.past.length > this.maxSize) {
            const removed = this.past.shift();
            if (removed) {
                this.appliedCommands.delete(removed.command.id);
            }
        }
        
        // Clear redo chain and remove their IDs from applied set
        this.future.forEach(entry => this.appliedCommands.delete(entry.command.id));
        this.future.length = 0;
    }

    push(command: Command, state: State, source: 'local' | 'remote' = 'local'): void {
        // Skip if this command was already applied
        if (this.appliedCommands.has(command.id)) {
            return;
        }

        // Don't record undo/redo commands in history
        if (command instanceof UndoCommand || command instanceof RedoCommand) {
            this.appliedCommands.add(command.id);
            return;
        }

        // Try to merge with the last command if possible (only for local commands)
        if (source === 'local') {
            const lastEntry = this.past[this.past.length - 1];
            if (lastEntry?.command.merge) {
                const merged = lastEntry.command.merge(command);
                if (merged) {
                    // Remove old command ID from applied set
                    this.appliedCommands.delete(lastEntry.command.id);
                    
                    // Revert last command and apply merged
                    lastEntry.command.invert(state);
                    merged.apply(state);
                    
                    // Replace last command with merged one
                    lastEntry.command = merged;
                    this.appliedCommands.add(merged.id);
                    
                    // Clear redo chain
                    this.future.forEach(entry => this.appliedCommands.delete(entry.command.id));
                    this.future.length = 0;
                    return;
                }
            }
        }

        // Apply the command
        command.apply(state);

        // Add to history
        const entry: CommandEntry = { command, source };
        this.past.push(entry);
        this.appliedCommands.add(command.id);

        // Enforce capacity limit
        if (this.past.length > this.maxSize) {
            const removed = this.past.shift();
            if (removed) {
                this.appliedCommands.delete(removed.command.id);
            }
        }

        // Clear redo chain
        this.future.forEach(entry => this.appliedCommands.delete(entry.command.id));
        this.future.length = 0;
    }

    undo(state: State, broadcast: boolean = true): boolean {
        const entry = this.past.pop();
        if (entry) {
            entry.command.invert(state);
            this.future.push(entry);
            
            // Emit state change event to trigger re-render
            eventBus.emit('stateChanged', { source: 'undo' });
            
            // Broadcast undo operation if requested and callback is set
            if (broadcast && this.onUndoRedo) {
                const undoCommand = new UndoCommand(entry.command.id);
                this.onUndoRedo(undoCommand);
            }
            
            return true;
        }
        return false;
    }

    redo(state: State, broadcast: boolean = true): boolean {
        const entry = this.future.pop();
        if (entry) {
            entry.command.apply(state);
            this.past.push(entry);
            
            // Emit state change event to trigger re-render
            eventBus.emit('stateChanged', { source: 'redo' });
            
            // Broadcast redo operation if requested and callback is set
            if (broadcast && this.onUndoRedo) {
                const redoCommand = new RedoCommand(entry.command.id);
                this.onUndoRedo(redoCommand);
            }
            
            return true;
        }
        return false;
    }

    canUndo(): boolean {
        return this.past.length > 0;
    }

    canRedo(): boolean {
        return this.future.length > 0;
    }

    clear(): void {
        this.past.length = 0;
        this.future.length = 0;
        this.appliedCommands.clear();
    }

    getHistorySize(): { past: number; future: number } {
        return {
            past: this.past.length,
            future: this.future.length
        };
    }

    subscribeToHistory(callback: () => void) {
        callback();
    }

    /**
     * Handle remote undo operation
     */
    handleRemoteUndo(undoCommand: UndoCommand, state: State): void {
        // Find the command to undo by ID
        const commandIndex = this.past.findIndex(entry => entry.command.id === undoCommand.getCommandId());
        if (commandIndex !== -1) {
            // Remove the command from past and add to future
            const [entry] = this.past.splice(commandIndex, 1);
            entry.command.invert(state);
            this.future.push(entry);
        }
    }

    /**
     * Handle remote redo operation
     */
    handleRemoteRedo(redoCommand: RedoCommand, state: State): void {
        // Find the command to redo by ID
        const commandIndex = this.future.findIndex(entry => entry.command.id === redoCommand.getCommandId());
        if (commandIndex !== -1) {
            // Remove the command from future and add to past
            const [entry] = this.future.splice(commandIndex, 1);
            entry.command.apply(state);
            this.past.push(entry);
        }
    }
}
