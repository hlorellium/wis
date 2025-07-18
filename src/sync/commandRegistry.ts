import type { Command } from '../commands';
import { AddShapeCommand, RemoveShapeCommand, PanCommand, UndoCommand, RedoCommand, DeleteShapeCommand, MoveShapesCommand, MoveVertexCommand, UpdateShapePropertiesCommand } from '../commands';
import type { Shape } from '../state';
import type { ShapePropertyUpdate } from '../commands/updateShapePropertiesCommand';

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
    deserialize(data: { shape: Shape; id: string; timestamp: number }): AddShapeCommand {
        return new AddShapeCommand(data.shape, data.id);
    }
};

const RemoveShapeCommandFactory: CommandFactory = {
    deserialize(data: { shape: Shape; id: string; timestamp: number }): RemoveShapeCommand {
        return new RemoveShapeCommand(data.shape, data.id);
    }
};

const PanCommandFactory: CommandFactory = {
    deserialize(data: { dx: number; dy: number; id: string; timestamp: number }): PanCommand {
        return new PanCommand(data.dx, data.dy, data.id);
    }
};

const UndoCommandFactory: CommandFactory = {
    deserialize(data: { commandId: string; id: string; timestamp: number }): UndoCommand {
        return new UndoCommand(data.commandId, data.id);
    }
};

const RedoCommandFactory: CommandFactory = {
    deserialize(data: { commandId: string; id: string; timestamp: number }): RedoCommand {
        return new RedoCommand(data.commandId, data.id);
    }
};

const DeleteShapeCommandFactory: CommandFactory = {
    deserialize(data: { shapeIds: string[]; deletedShapes: Shape[]; id: string; timestamp: number }): DeleteShapeCommand {
        const command = new DeleteShapeCommand(data.shapeIds, data.id);
        // Restore the deleted shapes for proper undo functionality
        (command as any).deletedShapes = data.deletedShapes;
        return command;
    }
};

const MoveShapesCommandFactory: CommandFactory = {
    deserialize(data: { shapeIds: string[]; dx: number; dy: number; id: string; timestamp: number }): MoveShapesCommand {
        return new MoveShapesCommand(data.shapeIds, data.dx, data.dy, data.id);
    }
};

const MoveVertexCommandFactory: CommandFactory = {
    deserialize(data: { 
        shapeId: string; 
        vertexIndex: number; 
        oldPos: { x: number; y: number }; 
        newPos: { x: number; y: number }; 
        id: string; 
        timestamp: number 
    }): MoveVertexCommand {
        return new MoveVertexCommand(data.shapeId, data.vertexIndex, data.oldPos, data.newPos, data.id);
    }
};

const UpdateShapePropertiesCommandFactory: CommandFactory = {
    deserialize(data: { updates: ShapePropertyUpdate[]; id: string; timestamp: number }): UpdateShapePropertiesCommand {
        return new UpdateShapePropertiesCommand(data.updates, data.id);
    }
};

// Register all command factories
CommandRegistry.register('AddShapeCommand', AddShapeCommandFactory);
CommandRegistry.register('RemoveShapeCommand', RemoveShapeCommandFactory);
CommandRegistry.register('PanCommand', PanCommandFactory);
CommandRegistry.register('UndoCommand', UndoCommandFactory);
CommandRegistry.register('RedoCommand', RedoCommandFactory);
CommandRegistry.register('DeleteShapeCommand', DeleteShapeCommandFactory);
CommandRegistry.register('MoveShapesCommand', MoveShapesCommandFactory);
CommandRegistry.register('MoveVertexCommand', MoveVertexCommandFactory);
CommandRegistry.register('UpdateShapePropertiesCommand', UpdateShapePropertiesCommandFactory);
