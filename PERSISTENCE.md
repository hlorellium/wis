# IndexedDB Persistence

This document describes the IndexedDB persistence functionality added to the drawing application.

## Overview

The application now automatically saves and restores the drawing state using IndexedDB, ensuring that your work persists across browser sessions and tab closures.

## Features

### Automatic State Persistence
- **Periodic Saving**: State is automatically saved every 30 seconds
- **Tab Close Saving**: State is saved when you close or refresh the tab
- **Visibility Change Saving**: State is saved when the tab becomes hidden (e.g., switching tabs)

### State Restoration
- When you open the application, it automatically checks for saved state
- If found, your previous drawing state (shapes, view position, zoom level, tool selection) is restored
- If no saved state exists, the application starts with the default initial state

### Multi-tab Compatibility
- Works seamlessly with the existing multi-tab synchronization
- All tabs share the same persisted state
- Last writer wins - the most recent state overwrites previous saves

## Technical Implementation

### Core Components

#### `IndexedDbStore<T>`
A lightweight, type-safe wrapper around the IndexedDB API:
- Handles database initialization and schema creation
- Provides async methods for get/put/delete operations
- Includes a synchronous `putSync` method for beforeunload events
- Comprehensive error handling with logging

#### `PersistenceManager`
High-level interface for state persistence:
- `loadState()`: Retrieves saved state from IndexedDB
- `saveState(state)`: Saves current state to IndexedDB
- `saveStateSync(state)`: Synchronous save for unload events
- `clearState()`: Removes saved state
- State validation to ensure data integrity
- Automatic cleanup of proxy wrappers for serialization

### Integration Points

#### Main Application (`src/main.ts`)
- Loads persisted state during initialization
- Sets up periodic saving (30-second intervals)
- Registers beforeunload and visibilitychange event handlers

#### State Management
- Works with the existing reactive state proxy system
- Automatically strips proxy wrappers before saving
- Validates state structure on load to prevent corruption

## Storage Details

- **Database Name**: `drawing-app`
- **Store Name**: `state`
- **Storage Key**: `snapshot`
- **Data Format**: Complete state object (JSON serializable)

### Supported Shape Types

The persistence system handles all drawing shapes with full type safety:

| Shape Type | Properties | Example |
|------------|------------|---------|
| `rectangle` | `x, y, width, height, color, id` | Filled rectangles |
| `circle` | `x, y, radius, color, id` | Stroked circles |
| `line` | `x1, y1, x2, y2, color, id` | Straight lines |
| `bezier` | `points[4], color, id` | Bézier curves with control points |

All shapes include:
- **id**: Unique identifier for each shape
- **color**: Hex color string (e.g., `#ff0000`)
- **type**: Discriminated union type for TypeScript safety

Bézier curves store four points: `[p0, cp1, cp2, p1]` where `p0` and `p1` are endpoints, and `cp1`, `cp2` are control points.

## Error Handling

- All IndexedDB operations are wrapped in try-catch blocks
- Errors are logged using the application's logger system
- Graceful fallback to initial state if loading fails
- Invalid data is automatically cleaned up

## Browser Compatibility

- Supported in all modern browsers that support IndexedDB
- Falls back gracefully if IndexedDB is not available
- No impact on application functionality if persistence fails

## Testing

Comprehensive test suite covers:
- Basic IndexedDB operations (store/retrieve/delete)
- State serialization and deserialization
- Error handling and validation
- Proxy wrapper cleanup
- Integration scenarios

Run tests with: `npm test tests/persistence.spec.ts`

## Future Enhancements

Potential improvements for future versions:
- **History Persistence**: Save and restore undo/redo history
- **Incremental Saving**: Only save changed data to reduce storage usage
- **Version Migration**: Handle state format changes across app versions
- **Storage Quotas**: Monitor and manage IndexedDB storage limits
- **Compression**: Compress large state objects before storage
- **Backup/Export**: Allow users to export/import their saved states

## Debugging

To inspect the saved state in browser DevTools:
1. Open DevTools (F12)
2. Go to Application/Storage tab
3. Navigate to IndexedDB → drawing-app → state
4. View the 'snapshot' entry

To clear saved state manually:
```javascript
// In browser console
const persistence = new PersistenceManager();
await persistence.clearState();
