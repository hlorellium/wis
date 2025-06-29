# Undo/Redo System Reliability Analysis and Improvements

## Problem Summary

The undo/redo system has fundamental reliability issues where edit tool operations (vertex editing, shape resizing, group movement) do not create undo entries, while basic drawing operations work correctly.

## Root Cause Analysis

### Original Architecture Issues

1. **State Mutation During Preview**: The original EditTool was directly mutating state during drag operations, then trying to create commands based on already-changed state
2. **Double-Application Problem**: Commands were being applied to state that had already been modified, causing inconsistent behavior
3. **Cache Invalidation Conflicts**: Manual cache clearing in EditTool interfered with command metadata handling
4. **Command Timing Issues**: Commands were created after state had already been modified, breaking the command pattern

### Key Architectural Differences

**Working Drawing Tools**:
- Store preview in `state.currentDrawing.shape` (separate from scene)
- Only add to `state.scene.shapes` via command execution
- No premature state mutation

**Broken Edit Tools**:
- Directly mutated `state.scene.shapes` during preview
- Created commands based on already-changed state
- Manual cache clearing and state management

## Implemented Solutions

### Phase 1: Preview State Architecture

**Added Preview State Support** (`src/state.ts`):
```typescript
currentEditing: {
    // ... existing properties
    previewShapes: Shape[] | null;     // Preview state during edits
    originalShapes: Shape[] | null;    // Original state backup
}
```

**Implemented Command-First EditTool** (`src/tools/editTool.ts`):
- **Preview-Only Mutations**: During mouse drag, only modify preview shapes
- **Original State Backup**: Store original shapes at drag start
- **Command Creation**: Calculate deltas between original and preview states
- **State Restoration**: Restore original state before applying commands
- **Clean Command Execution**: Commands apply to clean, unmodified state

### Phase 2: Improved Error Handling and Logging

**Enhanced Debugging**:
- Added comprehensive logging for command creation and execution
- Error recovery with state restoration on exceptions
- Proper state cleanup in all scenarios

**Threshold Adjustments**:
- Reduced movement thresholds from 0.1px to 0.01px for better sensitivity
- Ensured small movements still create undo entries

## Current Status

### ✅ Successfully Implemented
- Preview-first architecture in EditTool
- Original state backup and restoration
- Command creation from clean state deltas
- Comprehensive error handling and logging
- State migration for backward compatibility

### ❌ Still Failing
- Edit tool e2e tests still show disabled undo buttons
- Commands appear to not be reaching the history system
- Possible integration issues with the command flow chain

## Potential Remaining Issues

### 1. Command Flow Integration
The command may be created but not properly integrated with the history system. Possible causes:
- CommandExecutor rejecting commands due to duplicate ID checking
- History manager not recording edit commands
- Event bus integration conflicts

### 2. Tool Integration Issues
- MouseHandler may not be properly routing events to EditTool
- Tool state management conflicts
- Event handling order issues

### 3. State Proxy Conflicts
- StateProxy may be interfering with preview state management
- Rendering triggers may be causing state inconsistencies

## Recommended Next Steps

### Immediate Debugging
1. **Add Command Flow Tracing**: Insert logging at every step of the command flow
2. **Verify Command Execution**: Ensure commands reach CommandExecutor.execute()
3. **Check History Recording**: Verify commands are recorded in HistoryManager
4. **Test Command ID Uniqueness**: Ensure edit commands have unique IDs

### Architecture Improvements
1. **Command Validation**: Add validation to ensure commands are well-formed
2. **State Consistency Checks**: Add runtime validation for state integrity
3. **Event Order Management**: Ensure proper event handling sequence

### Testing Strategy
1. **Unit Tests for EditTool**: Test command creation logic in isolation
2. **Integration Tests**: Test EditTool + CommandExecutor + HistoryManager
3. **Manual Testing**: Add debug logging and test interactively

## Expected Benefits After Full Resolution

1. **Reliable Undo/Redo**: All edit operations will create proper undo entries
2. **Consistent State Management**: Preview operations won't corrupt application state
3. **Better Performance**: Reduced state mutations and cache invalidations
4. **Improved Maintainability**: Clear separation between preview and command execution

## Implementation Impact

### Files Modified
- `src/state.ts`: Added preview state properties
- `src/tools/editTool.ts`: Complete rewrite with preview-first architecture
- `tests/helpers.ts`: Updated for new state properties
- `tests/factories/shapeFactory.ts`: Updated state factory for tests

### Backward Compatibility
- State migration handles old states without preview properties
- Existing command interfaces unchanged
- Tool API remains compatible

## Conclusion

The fundamental architecture improvements have been implemented to resolve the undo/redo reliability issues. The preview-first approach eliminates the core problem of state mutation during command creation. However, integration issues are preventing the commands from reaching the history system. Further debugging of the command flow chain is needed to complete the reliability improvements.
