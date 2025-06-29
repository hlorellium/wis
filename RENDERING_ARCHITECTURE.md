# Rendering Architecture & State Management

This document establishes the clear, consistent architecture for state changes and rendering in the drawing application.

## Core Principles

### 1. Single Source of Truth: StateProxy
- **StateProxy** is the ONLY mechanism that triggers UI re-renders
- Any mutation to state automatically triggers `render()` via the proxy callback
- Uses `requestAnimationFrame` for batched, performant updates

### 2. EventBus for Side Effects Only
- **EventBus** handles side effects but NEVER calls `render()` directly
- Events are used for cache invalidation, persistence, sync, analytics, etc.
- Events are reactive responses to state changes, not render triggers

### 3. Clear Separation of Concerns
```
State Mutation → StateProxy → render() (UI update)
                    ↓
                EventBus → Side Effects (cache, persistence, etc.)
```

## Event Types & Responsibilities

### State Change Events
- `stateChanged` - Emitted for special state changes that need coordination (undo/redo)
- Used ONLY for triggering side effects, never for rendering

### Side Effect Events  
- `commandExecuted` - Command execution with metadata for side effects
- `commandFailed` - Command execution failures
- `cacheInvalidation` - Specific cache clearing instructions
- `persistence` - Data persistence triggers
- `sync` - Cross-tab synchronization

## Rendering Flow

### Normal Operations
1. User interaction (mouse, keyboard, tools)
2. Command execution mutates state
3. StateProxy detects change → triggers `render()`
4. EventBus emits `commandExecuted` → side effects

### Undo/Redo Operations
1. User presses Ctrl+Z/Ctrl+Y
2. HistoryManager mutates state (invert/apply commands)
3. StateProxy detects change → triggers `render()`
4. HistoryManager emits `stateChanged` → cache invalidation

### Force Renders (Eliminated)
- Preview overlays (selection rectangles) are rendered as part of normal state
- Canvas resizing triggers state change (viewport dimensions)
- No direct `render()` calls outside of StateProxy

## Implementation Rules

### ✅ Allowed
- State mutations that trigger proxy callback
- EventBus emissions for side effects
- Listening to EventBus for cache/persistence/sync

### ❌ Prohibited
- Direct `render()` calls from anywhere except StateProxy callback
- EventBus listeners that call `render()`
- Bypassing state mutations for UI updates
- Ad-hoc render triggers

## Benefits

1. **Predictable**: UI updates only happen when state actually changes
2. **Testable**: Mock state changes to test rendering behavior
3. **Performant**: Automatic batching via requestAnimationFrame
4. **Maintainable**: Clear separation between UI updates and side effects
5. **Debuggable**: Single code path for all renders

## Migration Checklist

- [x] Remove direct `render()` calls from components
- [x] Remove `stateChanged` event listeners that call `render()`
- [x] Route force-render scenarios through state mutations
- [x] Ensure all side effects use EventBus properly
- [x] Add integration tests for render behavior
- [x] Document any remaining exceptions with clear justification

## Migration Complete ✅

The unified rendering architecture has been successfully implemented:

### What Changed
1. **StateProxy Only**: All UI renders now happen exclusively through StateProxy onChange callbacks
2. **State-Driven Previews**: Selection drag previews use `state.ui.selectionDrag` instead of internal tool state
3. **EventBus for Side Effects**: Cache invalidation, persistence, and sync happen via EventBus events
4. **No Force Render Callbacks**: Removed all direct render() calls from MouseHandler and tools
5. **Unified Test Helpers**: All tests use `createTestState()` helper with proper UI fields

### Benefits Achieved
- **Predictable Rendering**: Only one code path triggers renders
- **Better Performance**: Automatic batching via requestAnimationFrame
- **Easier Testing**: Mock state changes to test rendering behavior
- **Cleaner Architecture**: Clear separation between UI updates and side effects
- **Maintainable**: No more ad-hoc render triggers to track down

## Testing Strategy

### Unit Tests
- StateProxy triggers render on state changes
- EventBus emits correct events for side effects
- No component directly calls render()

### Integration Tests
- End-to-end user interactions trigger exactly one render
- Undo/redo operations render correctly
- Multiple rapid state changes are batched efficiently

### Performance Tests
- Render frequency under normal load
- No duplicate or unnecessary renders
- Cache invalidation happens at right times

This architecture ensures the rendering system is both powerful and predictable, eliminating the current mix of declarative and imperative patterns.
