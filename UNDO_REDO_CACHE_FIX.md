# Undo/Redo Cache Invalidation Fix

## Problem Summary
After undo/redo operations, the visual state of shapes became inconsistent with the application state. Specifically:
- The selection overlay would update correctly after undo/redo
- But the actual shape rendering would remain in the old position
- This created a visual discrepancy where selection boxes appeared in the correct location but shapes appeared in the wrong location

## Root Cause Analysis
The issue was in the Path2D rendering cache system:

1. **Path2D Caching**: The `Path2DRenderer` caches shape geometries as `Path2D` objects for performance
2. **Cache Invalidation**: The cache was only cleared when `commandExecuted` events contained cache invalidation side effects
3. **Undo/Redo Events**: Undo/redo operations emit `stateChanged` events, not `commandExecuted` events
4. **Missing Link**: The `RenderingEventHandler` wasn't listening for `stateChanged` events to clear the cache

This meant when shapes moved via undo/redo:
- The shape's coordinates were correctly updated in the state
- The selection overlay was correctly rendered from the updated state
- But the shape itself was rendered from the stale cached Path2D object

## Solution Implemented

### 1. Enhanced RenderingEventHandler
**File**: `src/rendering/renderingEventHandler.ts`

Added subscription to `stateChanged` events in addition to `commandExecuted` events:

```typescript
start(): void {
    // Subscribe to command executed events
    const unsubscribeCommandExecuted = eventBus.subscribe<CommandExecutedEvent>('commandExecuted', (event) => {
        this.handleCommandExecuted(event);
    });
    
    // Subscribe to state changed events (for undo/redo cache invalidation)
    const unsubscribeStateChanged = eventBus.subscribe<{ source: string }>('stateChanged', (event) => {
        this.handleStateChanged(event);
    });
    
    // Combine unsubscribe functions
    this.unsubscribe = () => {
        unsubscribeCommandExecuted();
        unsubscribeStateChanged();
    };
}
```

### 2. Cache Invalidation for Undo/Redo
Added `handleStateChanged` method that clears the entire cache when undo/redo operations occur:

```typescript
private handleStateChanged(event: { source: string }): void {
    // Clear entire cache for undo/redo operations to ensure shapes are re-rendered
    // with their correct positions after state changes
    if (event.source === 'undo' || event.source === 'redo') {
        this.renderer.clearCache();
        logger.debug(`Cleared all cache due to ${event.source} operation`, 'RenderingEventHandler');
    }
}
```

### 3. Event Emission in HistoryManager
**File**: `src/history.ts`

Ensured that undo/redo operations emit `stateChanged` events:

```typescript
undo(state: State, broadcast: boolean = true): boolean {
    const entry = this.past.pop();
    if (entry) {
        entry.command.invert(state);
        this.future.push(entry);
        
        // Emit state change event to trigger re-render
        eventBus.emit('stateChanged', { source: 'undo' });
        
        // ... rest of method
    }
}

redo(state: State, broadcast: boolean = true): boolean {
    const entry = this.future.pop();
    if (entry) {
        entry.command.apply(state);
        this.past.push(entry);
        
        // Emit state change event to trigger re-render
        eventBus.emit('stateChanged', { source: 'redo' });
        
        // ... rest of method
    }
}
```

## Testing

### Comprehensive Test Coverage
- **All existing tests pass**: 234/234 tests passing
- **Selection integration tests**: `tests/undoRedoSelection.spec.ts` verifies proper selection handling
- **Manual verification**: The development server runs correctly with the fix applied

### Test Results
```
Test Files  20 passed (20)
Tests  234 passed (234)
Duration  6.89s
```

## Benefits

1. **Immediate Visual Consistency**: Undo/redo operations now immediately show shapes in their correct positions
2. **Preserved Performance**: Cache is only cleared for undo/redo operations, maintaining rendering performance for normal operations
3. **Robust Architecture**: Event-driven cache invalidation ensures consistency across all state changes
4. **No Breaking Changes**: All existing functionality continues to work as expected

## Technical Details

### Event Flow
1. User performs undo/redo operation (Ctrl+Z/Ctrl+Y)
2. `HistoryManager.undo/redo()` is called
3. Command is inverted/applied to update state
4. `stateChanged` event is emitted with source 'undo'/'redo'
5. `RenderingEventHandler` receives the event
6. Cache is cleared for undo/redo sources
7. Next render call creates fresh Path2D objects with correct coordinates
8. Visual state matches application state

### Performance Considerations
- Cache clearing is selective: only triggered for undo/redo operations
- Normal shape operations continue to use the efficient cache invalidation system
- Full cache clear is acceptable for undo/redo as these are infrequent user operations

## Files Modified
- `src/rendering/renderingEventHandler.ts` - Added stateChanged event handling
- `src/history.ts` - Added event emission for undo/redo operations

## Files Created
- `tests/undoRedoSelection.spec.ts` - Comprehensive undo/redo selection tests

The fix is now complete and functional, resolving the visual inconsistency issue with undo/redo operations.
