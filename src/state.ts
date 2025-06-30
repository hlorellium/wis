// Binary shape imports
import { BinaryShapeWrapper } from './core/binary/binaryShapeWrapper';
import { BinaryShapeArray } from './core/binary/binaryShapeArray';
import { ShapeMigration, type LegacyShape } from './core/binary/shapeMigration';

// Main Shape type is now BinaryShapeWrapper
export type Shape = BinaryShapeWrapper;

// Legacy types for backward compatibility
export type { LegacyShape };
export type RectangleShape = LegacyShape & { type: 'rectangle' };
export type LineShape = LegacyShape & { type: 'line' };
export type CircleShape = LegacyShape & { type: 'circle' };
export type BezierCurveShape = LegacyShape & { type: 'bezier' };

// Legacy geometry types
export type Rectangle = { x: number; y: number; width: number; height: number };
export type Line = { x1: number; y1: number; x2: number; y2: number };
export type Circle = { x: number; y: number; radius: number };

import type { Tool } from './constants';
import { generateId } from './constants';

export type { Tool };

export type State = {
    scene: {
        shapes: BinaryShapeArray;
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

// Create initial binary shapes
const createInitialShapes = (): BinaryShapeArray => {
    const shapes = new BinaryShapeArray();
    const defaultStyles = {
        fillMode: 'stroke' as const,
        strokeColor: '#f00',
        fillColor: '#f00', 
        strokeStyle: 'solid' as const,
        strokeWidth: 2
    };
    
    // Create 4 initial rectangles using binary format
    const rects = [
        { x: 10, y: 10, width: 20, height: 20 },
        { x: 30, y: 30, width: 20, height: 20 },
        { x: 50, y: 50, width: 20, height: 20 },
        { x: 70, y: 70, width: 20, height: 20 }
    ];
    
    for (const rect of rects) {
        const shape = ShapeMigration.createBinaryShape('rectangle', rect, defaultStyles);
        shapes.push(shape);
    }
    
    return shapes;
};

export const initialState: State = {
    scene: {
        shapes: createInitialShapes()
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
    
    // Convert legacy shapes to binary format if needed
    if (migrated.scene && migrated.scene.shapes) {
        if (Array.isArray(migrated.scene.shapes) && !(migrated.scene.shapes instanceof BinaryShapeArray)) {
            // Convert legacy array to binary shapes
            console.log('Migrating legacy shapes to binary format...');
            migrated.scene.shapes = ShapeMigration.legacyArrayToBinary(migrated.scene.shapes);
        }
    }
    
    return migrated as State;
}

export { generateId };
