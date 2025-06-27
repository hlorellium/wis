# WIS - Canvas Drawing Tool

A TypeScript + Vite canvas drawing application with an advanced command-pattern undo/redo system.

## Features

- **Drawing Tools**: Rectangle, Circle, Line drawing with color selection
- **Pan Tool**: Navigate around the canvas with mouse dragging
- **Undo/Redo System**: Command pattern implementation with merge support for pan operations
- **Reactive State**: Deep proxy-based state management with versioning
- **Modern UI**: ARIA-compliant toolbar with dynamic button states
- **TypeScript**: Full type safety throughout the application

## Architecture

### State Management
- **Reactive Proxy**: `src/stateProxy.ts` - Deep reactivity with optional RAF throttling and versioning
- **State Types**: `src/state.ts` - Discriminated union types for shapes and application state

### Command Pattern
- **History System**: `src/history.ts` - Command pattern with undo/redo, merge support, and capacity limits
- **Commands**: AddShapeCommand, RemoveShapeCommand, PanCommand (with merge capability)

### Rendering
- **Layered Canvas**: Background grid + shapes on separate canvases
- **Path2D Caching**: Optimized shape rendering with Path2D objects
- **Coordinate System**: Screen-to-canvas coordinate transformation

### Tools
- **Tool Manager**: `src/tools/toolManager.ts` - Centralized tool management with ARIA support
- **Drawing Tools**: `src/tools/drawingTools.ts` - Shape creation tools
- **Pan Tool**: `src/tools/panTool.ts` - Canvas navigation with command merging

## Development

### Prerequisites
- Node.js 18+
- npm or similar package manager

### Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing

The project uses **Vitest** for testing with comprehensive coverage of core functionality:

```bash
# Run tests once
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test -- --coverage
```

#### Test Coverage

The test suite focuses on the most encapsulated and critical components:

- **History System** (`tests/history.spec.ts`): 
  - Command pattern implementation
  - Undo/redo functionality
  - Command merging (PanCommand)
  - Capacity management
  - All command types (Add/Remove/Pan)

- **State Proxy** (`tests/stateProxy.spec.ts`):
  - Deep reactivity
  - Versioning system
  - RAF throttling
  - Property deletion handling
  - Option combinations
  - Edge cases

- **Test Helpers** (`tests/helpers.ts`):
  - Factory functions for test data
  - Reusable test state creation

#### Test Configuration

- **Environment**: `happy-dom` (fast DOM-like environment)
- **Coverage**: V8 provider with HTML, JSON, and text reports
- **Global APIs**: `describe`, `it`, `expect` available without imports
- **Excluded from Coverage**: App initialization, demo files, type definitions

### Project Structure

```
src/
├── constants.ts         # Tool types, colors, configuration
├── state.ts            # State types and initial data
├── stateProxy.ts       # Reactive proxy implementation
├── history.ts          # Command pattern and history management
├── main.ts            # Application initialization
├── style.css          # Global styles
├── canvas/            # Canvas setup and coordinate utilities
├── input/             # Mouse and keyboard event handling
├── rendering/         # Canvas rendering (background, shapes)
├── tools/             # Drawing tools and tool management
└── ui/               # UI components and interactions

tests/
├── helpers.ts         # Test utilities and factories
├── history.spec.ts    # History system tests
└── stateProxy.spec.ts # State proxy tests
```

### Key Design Patterns

1. **Command Pattern**: All state mutations go through commands that can be undone/redone
2. **Reactive Proxy**: State changes automatically trigger re-renders
3. **Discriminated Unions**: Type-safe shape handling with TypeScript
4. **Factory Pattern**: Centralized creation of shapes and test data
5. **Observer Pattern**: History callbacks notify UI of state changes

### Development Guidelines

- **Commands**: All state mutations should use the command pattern
- **Types**: Leverage TypeScript's discriminated unions for type safety
- **Testing**: Focus on pure functions and encapsulated logic first
- **State**: Use the reactive proxy for all state management
- **Tools**: Each tool should be self-contained with clear interfaces

## Browser Support

- Modern browsers with ES2020+ support
- Canvas 2D API required
- Proxy support required for reactive state

## License

MIT License
