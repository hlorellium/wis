// Base shape interface with common properties
type BaseShape = {
    id: string;
    color: string;
    zIndex: number; // Layer order - higher values render on top
    // Style properties (optional for backwards compatibility)
    fillMode?: 'stroke' | 'fill' | 'both';
    strokeColor?: string;
    fillColor?: string;
    strokeStyle?: 'solid' | 'dotted';
    strokeWidth?: number;
};

// Discriminated union types for each shape
export type RectangleShape = BaseShape & {
    type: 'rectangle';
    x: number;
    y: number;
    width: number;
    height: number;
};

export type LineShape = BaseShape & {
    type: 'line';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
};

export type CircleShape = BaseShape & {
    type: 'circle';
    x: number;
    y: number;
    radius: number;
};

export type BezierCurveShape = BaseShape & {
    type: 'bezier';
    points: { x: number; y: number }[]; // [p0, cp1, cp2, p1]
};

// Main Shape discriminated union
export type Shape = RectangleShape | LineShape | CircleShape | BezierCurveShape;

// Legacy type exports for backward compatibility (if needed)
export type Rectangle = Omit<RectangleShape, 'id' | 'color' | 'type'>;
export type Line = Omit<LineShape, 'id' | 'color' | 'type'>;
export type Circle = Omit<CircleShape, 'id' | 'color' | 'type'>;

import type { Tool } from './constants';
import { generateId } from './constants';

export type { Tool };

export type State = {
    scene: {
        shapes: Shape[];
    },
    view: {
        panX: number;
        panY: number;
        zoom: number;
    },
    tool: Tool;
    currentColor: string;
    // Style properties for new shapes
    fillMode: 'stroke' | 'fill' | 'both';
    strokeColor: string;
    fillColor: string;
    strokeStyle: 'solid' | 'dotted';
    strokeWidth: number;
    currentDrawing: {
        shape: Shape | null;
        type: Tool | null;
    };
    selection: string[];
    currentEditing: {
        shapeId: string | null;
        vertexIndex: number | null;
        isDragging: boolean;
        isGroupMove: boolean;
        dragStart: { x: number; y: number } | null;
        // Preview state for edit operations - doesn't affect history
        previewShapes: Shape[] | null;
        originalShapes: Shape[] | null;
    };
    ui: {
        selectionDrag: {
            isActive: boolean;
            start: { x: number; y: number } | null;
            current: { x: number; y: number } | null;
        };
    };
};

export const initialState: State = {
    scene: {
        shapes: [
            { id: generateId(), type: 'rectangle' as const, color: '#f00', x: 10, y: 10, width: 20, height: 20, zIndex: 1 },
            { id: generateId(), type: 'rectangle' as const, color: '#f00', x: 30, y: 30, width: 20, height: 20, zIndex: 2 },
            { id: generateId(), type: 'rectangle' as const, color: '#f00', x: 50, y: 50, width: 20, height: 20, zIndex: 3 },
            { id: generateId(), type: 'rectangle' as const, color: '#f00', x: 70, y: 70, width: 20, height: 20, zIndex: 4 },
        ]
    },
    view: {
        panX: 0, panY: 0,   // in CSS px
        zoom: 1,           // unitless, >0
    },
    tool: 'pan',
    currentColor: '#000000',
    // Style defaults
    fillMode: 'stroke',
    strokeColor: '#000000',
    fillColor: '#000000',
    strokeStyle: 'solid',
    strokeWidth: 2,
    currentDrawing: {
        shape: null,
        type: null
    },
    selection: [],
    currentEditing: {
        shapeId: null,
        vertexIndex: null,
        isDragging: false,
        isGroupMove: false,
        dragStart: null,
        previewShapes: null,
        originalShapes: null
    },
    ui: {
        selectionDrag: {
            isActive: false,
            start: null,
            current: null
        }
    }
};

/**
 * Migrates an old state object to include new properties with default values
 * This ensures backwards compatibility when loading persisted states
 */
export function migrateState(state: any): State {
    const migrated = { ...state };
    
    // Ensure all new style properties exist with defaults
    if (migrated.fillMode === undefined) {
        migrated.fillMode = 'stroke';
    }
    if (migrated.strokeColor === undefined) {
        migrated.strokeColor = '#000000';
    }
    if (migrated.fillColor === undefined) {
        migrated.fillColor = '#000000';
    }
    if (migrated.strokeStyle === undefined) {
        migrated.strokeStyle = 'solid';
    }
    if (migrated.strokeWidth === undefined) {
        migrated.strokeWidth = 2;
    }
    
    // Ensure currentColor exists (was added in previous update)
    if (migrated.currentColor === undefined) {
        migrated.currentColor = '#000000';
    }
    
    // Ensure currentEditing has new preview properties
    if (migrated.currentEditing && migrated.currentEditing.previewShapes === undefined) {
        migrated.currentEditing.previewShapes = null;
    }
    if (migrated.currentEditing && migrated.currentEditing.originalShapes === undefined) {
        migrated.currentEditing.originalShapes = null;
    }
    
    // Migrate shapes to include zIndex if missing
    if (migrated.scene && migrated.scene.shapes) {
        migrated.scene.shapes = migrated.scene.shapes.map((shape: any, index: number) => {
            if (shape.zIndex === undefined) {
                // Assign zIndex based on current array order to preserve existing layer order
                return { ...shape, zIndex: index + 1 };
            }
            return shape;
        });
    }
    
    return migrated as State;
}

export { generateId };
