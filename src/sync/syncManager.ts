import type { Command, HistoryManager } from "../history";
import type { State } from "../state";

type CommandMessage = {
    type: 'command';
    command: Command;
};

type Message = CommandMessage;

export class SyncManager {
    private bc: BroadcastChannel;
    private history: HistoryManager;
    private state: State;
    private onRemoteUpdate: () => void;

    constructor(
        state: State,
        history: HistoryManager,
        onRemoteUpdate: () => void
    ) {
        this.bc = new BroadcastChannel("whiteboard_channel");
        this.history = history;
        this.state = state;
        this.onRemoteUpdate = onRemoteUpdate;

        this.setupListener((command: Command) => {
            // Apply without broadcasting back
            this.history.push(command, this.state);
            this.onRemoteUpdate();
        });
    }

    executeCommand(command: Command) {
        this.history.push(command, this.state);

        this.bc.postMessage({ type: 'command', command });
    }

    setupListener(callback: (command: Command) => void) {
        this.bc.onmessage = (e: unknown) => {
            if (!isCommandMessage(e)) {
                throw new Error('Received invalid command from sync channel');
            }

            callback(e.command);
        };
    }
}

const isCommandMessage = (obj: unknown): obj is CommandMessage => {
    return typeof obj === 'object' && obj !== null && 'type' in obj && obj.type === 'command';
};
