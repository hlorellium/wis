# Drawing Application - Modular Architecture

This drawing application has been refactored into a clean, modular architecture for better maintainability and extensibility.

## Architecture Overview

```
src/
├── main.ts                 # Entry point and main app class
├── state.ts               # State types and initial state
├── style.css              # Application styles
├── canvas/
│   ├── setup.ts           # Canvas initialization and resizing
│   └── coordinates.ts     # Coordinate transformation utilities
├── rendering/
│   ├── renderer.ts        # Main rendering orchestration
│   ├── background.ts      # Grid background rendering
│   └── shapes.ts          # Shape rendering functions
├── tools/
│   ├── toolManager.ts     # Tool selection and UI management
│   ├── panTool.ts         # Pan tool implementation
│   └── drawingTools.ts    # Line, rectangle, circle drawing logic
└── input/
    └── mouse.ts           # Mouse event handling and delegation
```

## Key Components

### DrawingApp (main.ts)
The main application class that orchestrates all modules:
- Initializes all components
- Manages the render loop
- Coordinates between modules

### Canvas Module
- **CanvasSetup**: Handles canvas initialization, resizing, and DOM management
- **CoordinateTransformer**: Converts between screen and world coordinates

### Rendering Module
- **Renderer**: Main rendering orchestration for shapes and preview
- **BackgroundRenderer**: Handles grid background rendering
- **ShapeRenderer**: Individual shape rendering logic

### Tools Module
- **ToolManager**: Manages tool selection and UI state
- **PanTool**: Implements pan/zoom functionality
- **DrawingTools**: Implements line, rectangle, and circle drawing

### Input Module
- **MouseHandler**: Centralizes mouse event handling and delegates to appropriate tools

## Benefits

1. **Separation of Concerns**: Each module has a single, clear responsibility
2. **Reusability**: Components can be easily reused or replaced
3. **Testability**: Individual modules can be tested in isolation
4. **Scalability**: Easy to add new tools or features
5. **Maintainability**: Code is organized logically and easy to navigate

## Adding New Tools

To add a new drawing tool:

1. Add the tool type to `state.ts`
2. Create the tool logic in a new file under `tools/`
3. Add rendering logic to `shapes.ts`
4. Update the HTML toolbar with the new tool button
5. Register the tool in `ToolManager`

## Features

- **Pan Tool**: Click and drag to pan the canvas
- **Line Tool**: Click and drag to draw lines
- **Rectangle Tool**: Click and drag to draw rectangles
- **Circle Tool**: Click and drag to draw circles from center
- **Zoom**: Mouse wheel to zoom in/out at cursor position
- **Live Preview**: See shapes while drawing with dashed outline

All drawing operations respect the current pan and zoom state, allowing for precise drawing at any scale.
