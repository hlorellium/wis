// Tool types for better type safety
export const TOOL_TYPES = {
    PAN: 'pan',
    LINE: 'line',
    RECTANGLE: 'rectangle',
    CIRCLE: 'circle',
    CURVE: 'curve',
    SELECT: 'select',
    EDIT: 'edit'
} as const;

export type Tool = typeof TOOL_TYPES[keyof typeof TOOL_TYPES];

// Color palette
export const PALETTE = {
    LINE: '#0080ff',
    RECTANGLE: '#f00',
    CIRCLE: '#00ff80',
    CURVE: '#ff00ff'
} as const;

// History configuration
export const HISTORY_CONFIG = {
    MAX_STACK_SIZE: 100,
    PAN_THRESHOLD: 1
} as const;

// Canvas configuration
export const CANVAS_CONFIG = {
    DEFAULT_DPR: 1,
    RESIZE_DEBOUNCE_MS: 16
} as const;

// UI configuration
export const UI_CONFIG = {
    DEFAULT_CURSOR: 'default',
    PAN_CURSOR: 'grab',
    PANNING_CURSOR: 'grabbing',
    DRAWING_CURSOR: 'crosshair'
} as const;

// Hit-testing and interaction configuration
export const HIT_CONFIG = {
    HANDLE_RADIUS: 8,           // Radius for edit handles (pixels)
    DRAG_THRESHOLD: 5,          // Minimum drag distance before considering it a drag
    LINE_TOLERANCE: 5,          // Tolerance for line hit-testing (pixels)
    SELECTION_RECT_MIN: 5,      // Minimum drag distance for selection rectangle
    CLICK_TOLERANCE: 5          // General click tolerance for hit-testing
} as const;

// Sync configuration
export const SYNC_CONFIG = {
    DEFAULT_CHANNEL: 'drawing-app-sync',
    COMMAND_TIMEOUT_MS: 5000
} as const;

// Logger configuration
export const LOGGER_CONFIG = {
    MAX_LOGS: 1000,
    DEFAULT_CONTEXT: 'App'
} as const;

// Generate deterministic IDs for testing
let idCounter = 0;
export function generateId(): string {
    return `shape_${++idCounter}_${Math.random().toString(36).substr(2, 6)}`;
}

// Reset counter for tests
export function resetIdCounter(): void {
    idCounter = 0;
}
