import { ShapeBuffer, type StyleData } from './shapeBuffer';
import { BinaryShapeWrapper } from './binaryShapeWrapper';
import { BinaryShapeArray } from './binaryShapeArray';
import { generateId } from '../../constants';

// Legacy shape types for migration
export interface LegacyShape {
    id: string;
    type: 'rectangle' | 'line' | 'circle' | 'bezier';
    color: string;
    // Style properties (optional for backwards compatibility)
    fillMode?: 'stroke' | 'fill' | 'both';
    strokeColor?: string;
    fillColor?: string;
    strokeStyle?: 'solid' | 'dotted';
    strokeWidth?: number;
    // Geometry properties
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    radius?: number;
    points?: { x: number; y: number }[];
}

/**
 * Converts legacy shape objects to binary format
 */
export class ShapeMigration {
    /**
     * Convert a legacy shape to a BinaryShapeWrapper
     */
    static legacyToBinary(legacyShape: LegacyShape): BinaryShapeWrapper {
        const styles = this.extractStyles(legacyShape);
        let buffer: ArrayBuffer;

        switch (legacyShape.type) {
            case 'rectangle':
                buffer = ShapeBuffer.createRectangle(
                    legacyShape.id,
                    legacyShape.x || 0,
                    legacyShape.y || 0,
                    legacyShape.width || 0,
                    legacyShape.height || 0,
                    styles
                );
                break;

            case 'line':
                buffer = ShapeBuffer.createLine(
                    legacyShape.id,
                    legacyShape.x1 || 0,
                    legacyShape.y1 || 0,
                    legacyShape.x2 || 0,
                    legacyShape.y2 || 0,
                    styles
                );
                break;

            case 'circle':
                buffer = ShapeBuffer.createCircle(
                    legacyShape.id,
                    legacyShape.x || 0,
                    legacyShape.y || 0,
                    legacyShape.radius || 0,
                    styles
                );
                break;

            case 'bezier':
                const points = legacyShape.points || [
                    { x: 0, y: 0 },
                    { x: 0, y: 0 },
                    { x: 0, y: 0 },
                    { x: 0, y: 0 }
                ];
                buffer = ShapeBuffer.createBezier(
                    legacyShape.id,
                    points,
                    styles
                );
                break;

            default:
                throw new Error(`Unknown shape type: ${legacyShape.type}`);
        }

        return new BinaryShapeWrapper(buffer, legacyShape.id);
    }

    /**
     * Convert an array of legacy shapes to BinaryShapeArray
     */
    static legacyArrayToBinary(legacyShapes: LegacyShape[]): BinaryShapeArray {
        const binaryArray = new BinaryShapeArray();
        
        for (const legacyShape of legacyShapes) {
            try {
                const binaryShape = this.legacyToBinary(legacyShape);
                binaryArray.push(binaryShape);
            } catch (error) {
                console.warn(`Failed to convert shape ${legacyShape.id}:`, error);
                // Skip invalid shapes rather than failing completely
            }
        }

        return binaryArray;
    }

    /**
     * Convert a BinaryShapeWrapper back to legacy format (for compatibility)
     */
    static binaryToLegacy(binaryShape: BinaryShapeWrapper): LegacyShape {
        const legacyShape: LegacyShape = {
            id: binaryShape.id,
            type: binaryShape.type as any,
            color: binaryShape.color, // Legacy compatibility
            fillMode: binaryShape.fillMode,
            strokeColor: binaryShape.strokeColor,
            fillColor: binaryShape.fillColor,
            strokeStyle: binaryShape.strokeStyle,
            strokeWidth: binaryShape.strokeWidth
        };

        // Add geometry properties based on type
        switch (binaryShape.type) {
            case 'rectangle':
                legacyShape.x = binaryShape.x;
                legacyShape.y = binaryShape.y;
                legacyShape.width = binaryShape.width;
                legacyShape.height = binaryShape.height;
                break;

            case 'line':
                legacyShape.x1 = binaryShape.x1;
                legacyShape.y1 = binaryShape.y1;
                legacyShape.x2 = binaryShape.x2;
                legacyShape.y2 = binaryShape.y2;
                break;

            case 'circle':
                legacyShape.x = binaryShape.x;
                legacyShape.y = binaryShape.y;
                legacyShape.radius = binaryShape.radius;
                break;

            case 'bezier':
                legacyShape.points = binaryShape.points;
                break;
        }

        return legacyShape;
    }

    /**
     * Create a new binary shape with given parameters
     */
    static createBinaryShape(
        type: 'rectangle' | 'line' | 'circle' | 'bezier',
        geometry: any,
        styles: StyleData,
        id?: string
    ): BinaryShapeWrapper {
        const shapeId = id || generateId();
        let buffer: ArrayBuffer;

        switch (type) {
            case 'rectangle':
                buffer = ShapeBuffer.createRectangle(
                    shapeId,
                    geometry.x,
                    geometry.y,
                    geometry.width,
                    geometry.height,
                    styles
                );
                break;

            case 'line':
                buffer = ShapeBuffer.createLine(
                    shapeId,
                    geometry.x1,
                    geometry.y1,
                    geometry.x2,
                    geometry.y2,
                    styles
                );
                break;

            case 'circle':
                buffer = ShapeBuffer.createCircle(
                    shapeId,
                    geometry.x,
                    geometry.y,
                    geometry.radius,
                    styles
                );
                break;

            case 'bezier':
                buffer = ShapeBuffer.createBezier(
                    shapeId,
                    geometry.points,
                    styles
                );
                break;

            default:
                throw new Error(`Unknown shape type: ${type}`);
        }

        return new BinaryShapeWrapper(buffer, shapeId);
    }

    /**
     * Extract style data from legacy shape
     */
    private static extractStyles(legacyShape: LegacyShape): StyleData {
        return {
            fillMode: legacyShape.fillMode || 'stroke',
            strokeColor: legacyShape.strokeColor || legacyShape.color || '#000000',
            fillColor: legacyShape.fillColor || legacyShape.color || '#000000',
            strokeStyle: legacyShape.strokeStyle || 'solid',
            strokeWidth: legacyShape.strokeWidth || 2
        };
    }
}
