import { CommandExecutor } from '../commandExecutor';
import type { CommandSource } from '../commandExecutor';
import type { Command } from '../commands';
import { PanCommand, UndoCommand, RedoCommand } from '../commands';
import type { State } from '../state';
import { HistoryManager } from '../history';
import { CommandRegistry } from './commandRegistry';
import { logger } from '../utils/logger';

interface SerializedCommand {
    type: string;
    data: any;
    id: string;
    timestamp: number;
}

interface SyncMessage {
    type: 'command';
    command: SerializedCommand;
}

/**
 * Manages synchronization of commands between browser tabs using BroadcastChannel.
 * Listens for local commands and broadcasts them to other tabs,
 * and applies remote commands received from other tabs.
 */
export class SyncManager {
    private channel: BroadcastChannel;
    private unsubscribe: () => void;
    private executor: CommandExecutor;
    private state: State;
    private history: HistoryManager;

    constructor(
        executor: CommandExecutor,
        state: State,
        history: HistoryManager,
        channelName: string = 'drawing-app-sync'
    ) {
        this.executor = executor;
        this.state = state;
        this.history = history;
        this.channel = new BroadcastChannel(channelName);
        this.setupMessageListener();
        this.unsubscribe = this.setupCommandListener();
    }

    /**
     * Listen for commands from the executor and broadcast local ones
     */
    private setupCommandListener(): () => void {
        return this.executor.subscribe((command, source) => {
            // Only broadcast commands that originated locally and should be synced
            if (source === 'local' && this.shouldSync(command)) {
                this.broadcastCommand(command);
            }
        });
    }

    /**
     * Determine if a command should be synced across tabs
     */
    private shouldSync(command: Command): boolean {
        // Don't sync pan commands - these should remain local to each tab
        if (command instanceof PanCommand) {
            return false;
        }
        
        // Sync undo/redo commands to enable synchronized history
        if (command instanceof UndoCommand || command instanceof RedoCommand) {
            return true;
        }
        
        // Sync all other commands (AddShape, RemoveShape, etc.)
        return true;
    }

    /**
     * Listen for messages from other tabs
     */
    private setupMessageListener(): void {
        this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
            if (event.data.type === 'command') {
                this.handleRemoteCommand(event.data.command);
            }
        };
    }

    /**
     * Broadcast a command to other tabs
     */
    private broadcastCommand(command: Command): void {
        const serialized = this.serializeCommand(command);
        const message: SyncMessage = {
            type: 'command',
            command: serialized
        };

        try {
            logger.info(`Broadcasting command: ${serialized.type}`, 'SyncManager', serialized.data);
            this.channel.postMessage(message);
        } catch (error) {
            logger.warn('Failed to broadcast command', 'SyncManager', error);
        }
    }

    /**
     * Handle a command received from another tab
     */
    private handleRemoteCommand(serialized: SerializedCommand): void {
        try {
            logger.info(`Received remote command: ${serialized.type}`, 'SyncManager', serialized.data);
            const command = this.deserializeCommand(serialized);
            // Use history.push to both apply the command AND record it for undo
            // This ensures remote commands are undoable in all tabs
            this.history.push(command, this.state, 'remote');
            logger.info(`Applied remote command: ${serialized.type}`, 'SyncManager');
        } catch (error) {
            logger.warn('Failed to apply remote command', 'SyncManager', error);
        }
    }

    /**
     * Serialize a command for transmission
     */
    private serializeCommand(command: Command): SerializedCommand {
        const { type, data } = CommandRegistry.serialize(command);
        return {
            type,
            data,
            id: command.id, // Preserve original command ID for proper duplicate checking
            timestamp: Date.now()
        };
    }

    /**
     * Deserialize a command from transmission data
     */
    private deserializeCommand(serialized: SerializedCommand): Command {
        const { type, data } = serialized;
        const command = CommandRegistry.deserialize(type, data);
        // Ensure the deserialized command has the same ID as the serialized one
        (command as any).id = serialized.id;
        return command;
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        this.unsubscribe();
        this.channel.close();
    }

    /**
     * Get the channel name (useful for testing)
     */
    getChannelName(): string {
        return this.channel.name;
    }
}
