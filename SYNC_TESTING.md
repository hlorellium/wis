# Testing Multi-Tab Sync Functionality

## Quick Test

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open two browser tabs** to the same URL (usually `http://localhost:5174/`)

3. **Test drawing sync:**
   - In Tab 1: Select rectangle tool and draw a rectangle
   - In Tab 2: You should immediately see the rectangle appear
   - In Tab 2: Select circle tool and draw a circle  
   - In Tab 1: You should immediately see the circle appear

4. **Test pan isolation:**
   - In Tab 1: Select pan tool and drag the canvas around
   - In Tab 2: The view should NOT move (panning stays local)
   - In Tab 2: Pan independently
   - In Tab 1: Should not be affected by Tab 2's panning

## What Gets Synced

✅ **Synchronized between tabs:**
- Drawing rectangles
- Drawing circles  
- Drawing lines
- Shape additions/removals

❌ **NOT synchronized (stays local per tab):**
- Canvas panning
- Canvas zoom
- Tool selection
- Current drawing in progress

## Technical Details

The sync system uses:
- **BroadcastChannel API** for efficient same-origin communication
- **Command pattern** with serialization for reliable state updates
- **Source tracking** to prevent infinite loops between tabs
- **Selective sync** to exclude view operations like panning

## Troubleshooting

If sync isn't working:

1. **Check browser console** for errors
2. **Verify BroadcastChannel support** (modern browsers only)
3. **Ensure same origin** (same protocol, host, port)
4. **Check network tab** - no external requests needed for local sync

## Architecture

```
Local Tab:  Tool → Command → Executor → History + SyncManager → BroadcastChannel
Remote Tab: BroadcastChannel → SyncManager → Executor → History + State Update
```

Commands are serialized as JSON and broadcast. Remote tabs deserialize and apply them without re-broadcasting.
