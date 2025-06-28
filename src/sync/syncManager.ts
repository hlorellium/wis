import { CommandExecutor } from '../commandExecutor';
import type { CommandSource } from '../commandExecutor';
import type { Command } from '../history';
import { PanCommand } from '../history';
import type { State } from '../state';
import { CommandRegistry } from './commandRegistry';

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

    constructor(
        executor: CommandExecutor,
        state: State,
        channelName: string = 'drawing-app-sync'
    ) {
        this.executor = executor;
        this.state = state;
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
            this.channel.postMessage(message);
        } catch (error) {
            console.warn('Failed to broadcast command:', error);
        }
    }

    /**
     * Handle a command received from another tab
     */
    private handleRemoteCommand(serialized: SerializedCommand): void {
        try {
            const command = this.deserializeCommand(serialized);
            // Execute as remote command to avoid re-broadcasting
            this.executor.execute(command, this.state, 'remote');
        } catch (error) {
            console.warn('Failed to apply remote command:', error);
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
            id: crypto.randomUUID(),
            timestamp: Date.now()
        };
    }

    /**
     * Deserialize a command from transmission data
     */
    private deserializeCommand(serialized: SerializedCommand): Command {
        const { type, data } = serialized;
        return CommandRegistry.deserialize(type, data);
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
