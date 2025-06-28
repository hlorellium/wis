import type { State } from './state';
import { HISTORY_CONFIG } from './constants';
import type { Command } from './commands';

// Re-export commands for backward compatibility
export type { Command } from './commands';
export { AddShapeCommand, RemoveShapeCommand, PanCommand } from './commands';

export class HistoryManager {
    private past: Command[] = [];
    private future: Command[] = [];
    private readonly maxSize: number;

    constructor(maxSize: number = HISTORY_CONFIG.MAX_STACK_SIZE) {
        this.maxSize = maxSize;
    }

    record(command: Command): void {
        // Record a command that has already been executed
        this.past.push(command);
        
        // Enforce capacity limit
        if (this.past.length > this.maxSize) {
            this.past.shift(); // remove oldest command
        }
        
        // Clear redo chain
        this.future.length = 0;
    }

    push(command: Command, state: State): void {
        // Try to merge with the last command if possible
        const lastCommand = this.past[this.past.length - 1];
        if (lastCommand?.merge) {
            const merged = lastCommand.merge(command);
            if (merged) {
                // Replace last command with merged one
                this.past[this.past.length - 1] = merged;
                // Revert last command and apply merged
                lastCommand.invert(state);
                merged.apply(state);
                this.future.length = 0; // clear redo chain
                return;
            }
        }

        // Apply the command
        command.apply(state);

        // Add to history
        this.past.push(command);

        // Enforce capacity limit
        if (this.past.length > this.maxSize) {
            this.past.shift(); // remove oldest command
        }

        // Clear redo chain
        this.future.length = 0;
    }

    undo(state: State): boolean {
        const command = this.past.pop();
        if (command) {
            command.invert(state);
            this.future.push(command);
            return true;
        }
        return false;
    }

    redo(state: State): boolean {
        const command = this.future.pop();
        if (command) {
            command.apply(state);
            this.past.push(command);
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
}
