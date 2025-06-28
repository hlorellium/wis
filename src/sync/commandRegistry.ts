import type { Command } from '../commands';
import { AddShapeCommand, RemoveShapeCommand, PanCommand } from '../commands';
import type { Shape } from '../state';

export interface SerializableCommand {
    serialize(): any;
}

export interface CommandFactory {
    deserialize(data: any): Command;
}

/**
 * Registry for command serialization and deserialization
 */
export class CommandRegistry {
    private static factories = new Map<string, CommandFactory>();

    static register(commandName: string, factory: CommandFactory): void {
        this.factories.set(commandName, factory);
    }

    static deserialize(type: string, data: any): Command {
        const factory = this.factories.get(type);
        if (!factory) {
            throw new Error(`No factory registered for command type: ${type}`);
        }
        return factory.deserialize(data);
    }

    static serialize(command: Command): { type: string; data: any } {
        const serializableCommand = command as unknown as SerializableCommand;
        if (typeof serializableCommand.serialize !== 'function') {
            throw new Error(`Command ${command.constructor.name} is not serializable`);
        }
        return {
            type: command.constructor.name,
            data: serializableCommand.serialize()
        };
    }
}

// Factory implementations
const AddShapeCommandFactory: CommandFactory = {
    deserialize(data: { shape: Shape }): AddShapeCommand {
        return new AddShapeCommand(data.shape);
    }
};

const RemoveShapeCommandFactory: CommandFactory = {
    deserialize(data: { shape: Shape }): RemoveShapeCommand {
        return new RemoveShapeCommand(data.shape);
    }
};

const PanCommandFactory: CommandFactory = {
    deserialize(data: { dx: number; dy: number }): PanCommand {
        return new PanCommand(data.dx, data.dy);
    }
};

// Register all command factories
CommandRegistry.register('AddShapeCommand', AddShapeCommandFactory);
CommandRegistry.register('RemoveShapeCommand', RemoveShapeCommandFactory);
CommandRegistry.register('PanCommand', PanCommandFactory);
