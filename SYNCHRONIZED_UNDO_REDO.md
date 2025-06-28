# Synchronized Undo/Redo Implementation

## Overview

This document describes the implementation of synchronized undo/redo functionality across multiple browser tabs in the drawing application. The solution provides a global history where undo/redo operations are synchronized across all tabs, maintaining consistency in the collaborative environment.

## Architecture

### Core Components

1. **Command System with IDs**
   - All commands now have unique IDs and timestamps
   - Commands include: `AddShapeCommand`, `RemoveShapeCommand`, `PanCommand`, `UndoCommand`, `RedoCommand`
   - Command deduplication prevents the same command from being executed multiple times

2. **Global History Manager**
   - Records both local and remote commands in a shared history
   - Maintains undo/redo stacks that represent the global state
   - Broadcasts undo/redo operations to other tabs

3. **Enhanced Command Executor**
   - Central dispatcher with command deduplication
   - Special handling for undo/redo commands
   - Prevents infinite loops and duplicate executions

4. **Updated Sync Manager**
   - Synchronizes undo/redo commands across tabs
   - Maintains existing sync for regular commands (AddShape, RemoveShape)
   - Excludes PanCommand from sync (remains local to each tab)

## Key Changes Made

### 1. Command Interface Updates

```typescript
export interface Command {
    id: string;                  // unique command identifier
    timestamp: number;           // when the command was created
    apply(state: State): void;   // execute (redo)
    invert(state: State): void;  // undo
    merge?(other: Command): Command | null; // optional command merging
}
```

### 2. New Command Types

```typescript
export class UndoCommand implements Command {
    // Represents an undo operation that can be synchronized
    private readonly commandId: string; // ID of command being undone
}

export class RedoCommand implements Command {
    // Represents a redo operation that can be synchronized
    private readonly commandId: string; // ID of command being redone
}
```

### 3. Global History Approach

**Before**: Only local commands were recorded in history
```typescript
executor.subscribe((command, source) => {
    if (source === 'local') {
        history.record(command);
    }
});
```

**After**: All commands are recorded in global history
```typescript
executor.subscribe((command, source) => {
    history.record(command, source);
});
```

### 4. Command Deduplication

- **CommandExecutor**: Prevents duplicate command execution using command IDs
- **HistoryManager**: Prevents duplicate command recording
- **SyncManager**: Existing serialization ensures consistent command IDs across tabs

## How Synchronized Undo/Redo Works

### Local Undo Operation

1. User presses Ctrl+Z in Tab A
2. `HistoryManager.undo()` is called
3. Most recent command is inverted and moved to future stack
4. `UndoCommand` is created and broadcast via `SyncManager`
5. Other tabs receive the `UndoCommand` and apply the same undo operation

### Remote Undo Operation

1. Tab B receives `UndoCommand` from broadcast
2. `CommandExecutor` routes it to `HistoryManager.handleRemoteUndo()`
3. The specific command is found by ID and undone
4. History stacks are updated to maintain consistency

### Conflict Resolution

- **First-wins approach**: Commands are processed in timestamp order
- **Command deduplication**: Same command ID can only be executed once
- **No CRDTs**: Simple conflict resolution suitable for drawing application

## Benefits

1. **True Multi-tab Sync**: Undo/redo works consistently across all tabs
2. **Global State**: All tabs maintain identical history and can undo any operation
3. **Prevents Loops**: Command IDs and deduplication prevent infinite sync loops
4. **Foundation for Persistence**: Easy to save/load history from IndexedDB later
5. **Event Sourcing**: State is truly derived from the sequence of commands

## Testing

### New Test Suite: `history-sync.spec.ts`

Tests cover:
- Global history recording (both local and remote commands)
- Remote undo/redo command handling
- Command deduplication
- Synchronized state consistency

### Updated Existing Tests

- All existing tests pass (121/121)
- Command merging still works correctly
- History capacity limits are maintained
- Backward compatibility preserved

## Usage Instructions

### Testing Multi-tab Sync

1. Open the application in multiple browser tabs
2. Draw shapes in different tabs
3. Use Ctrl+Z (undo) or Ctrl+Shift+Z (redo) in any tab
4. Observe that the undo/redo affects all tabs simultaneously

### Keyboard Shortcuts

- **Ctrl+Z** (Cmd+Z on Mac): Undo
- **Ctrl+Shift+Z** (Cmd+Shift+Z on Mac): Redo  
- **Ctrl+Y** (Cmd+Y on Mac): Alternative redo

## Implementation Details

### Command ID Generation

Commands use `crypto.randomUUID()` for unique identification:

```typescript
constructor(shape: Shape, id?: string) {
    this.shape = JSON.parse(JSON.stringify(shape));
    this.id = id || crypto.randomUUID();
    this.timestamp = Date.now();
}
```

### Serialization Updates

All commands now serialize their ID and timestamp:

```typescript
serialize(): { shape: Shape; id: string; timestamp: number } {
    return { shape: this.shape, id: this.id, timestamp: this.timestamp };
}
```

### History Capacity Management

- Maintains 100-command limit across all tabs
- Oldest commands are removed when limit is exceeded
- Command IDs are properly cleaned up to prevent memory leaks

## Future Enhancements

1. **IndexedDB Persistence**: Save command history for tab restoration
2. **Optimistic UI**: Apply local commands immediately while syncing
3. **Conflict Resolution**: More sophisticated CRDT-based approach if needed
4. **History Compression**: Compact old commands to save memory
5. **Selective Sync**: Option to disable sync for specific command types

## Performance Considerations

- Command deduplication uses `Set<string>` for O(1) lookup
- History operations remain O(1) for push/pop
- Memory usage scales with history size (100 commands max)
- Network traffic includes undo/redo commands but minimal overhead

## Backward Compatibility

- All existing functionality is preserved
- Tool behavior unchanged
- Pan commands remain local to each tab
- Canvas rendering and state management unaffected
