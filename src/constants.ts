// Tool types for better type safety
export const TOOL_TYPES = {
    PAN: 'pan',
    LINE: 'line',
    RECTANGLE: 'rectangle',
    CIRCLE: 'circle',
    SELECT: 'select'
} as const;

export type Tool = typeof TOOL_TYPES[keyof typeof TOOL_TYPES];

// Color palette
export const PALETTE = {
    LINE: '#0080ff',
    RECTANGLE: '#f00',
    CIRCLE: '#00ff80'
} as const;

// History configuration
export const HISTORY_CONFIG = {
    MAX_STACK_SIZE: 100,
    PAN_THRESHOLD: 1
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
