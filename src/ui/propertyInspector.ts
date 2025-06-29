import type { State, Shape, RectangleShape, LineShape, CircleShape, BezierCurveShape } from '../state';
import type { CommandExecutor } from '../commandExecutor';
import { UpdateShapePropertiesCommand, type ShapePropertyUpdate } from '../commands/updateShapePropertiesCommand';
import { getRequiredElement } from '../utils/dom';

export class PropertyInspector {
    private element: HTMLElement;
    private executor: CommandExecutor;
    private state: State | null = null;
    private currentSelection: string[] = [];
    private debounceTimer: number | null = null;

    constructor(executor: CommandExecutor) {
        this.executor = executor;
        this.element = getRequiredElement('#property-inspector');
        this.setupEventListeners();
    }

    /**
     * Initialize the property inspector with the current state
     */
    initialize(state: State): void {
        this.state = state;
        this.updateDisplay();
    }

    /**
     * Update the property inspector when selection changes
     */
    updateSelection(newSelection: string[]): void {
        this.currentSelection = [...newSelection];
        this.updateDisplay();
    }

    private updateDisplay(): void {
        if (!this.state || this.currentSelection.length === 0) {
            this.hidePanel();
            return;
        }

        this.showPanel();
        
        if (this.currentSelection.length === 1) {
            this.displaySingleShape();
        } else {
            this.displayMultipleShapes();
        }
    }

    private hidePanel(): void {
        this.element.style.display = 'none';
    }

    private showPanel(): void {
        this.element.style.display = 'block';
    }

    private displaySingleShape(): void {
        if (!this.state) return;
        
        const shapeId = this.currentSelection[0];
        const shape = this.state.scene.shapes.find(s => s.id === shapeId);
        
        if (!shape) {
            this.hidePanel();
            return;
        }

        this.renderShapeProperties(shape);
    }

    private displayMultipleShapes(): void {
        if (!this.state) return;
        
        const shapes = this.currentSelection
            .map(id => this.state!.scene.shapes.find(s => s.id === id))
            .filter((shape): shape is Shape => shape !== undefined);

        if (shapes.length === 0) {
            this.hidePanel();
            return;
        }

        this.renderMultiShapeProperties(shapes);
    }

    private renderShapeProperties(shape: Shape): void {
        const content = this.buildShapePropertyHTML(shape);
        this.element.innerHTML = content;
        this.bindPropertyEvents();
    }

    private renderMultiShapeProperties(shapes: Shape[]): void {
        const commonProps = this.extractCommonProperties(shapes);
        const content = this.buildMultiShapePropertyHTML(shapes, commonProps);
        this.element.innerHTML = content;
        this.bindPropertyEvents();
    }

    private buildShapePropertyHTML(shape: Shape): string {
        const shapeTypeLabel = this.getShapeTypeLabel(shape);
        
        return `
            <div class="property-header">
                <h3 class="property-title">${shapeTypeLabel}</h3>
                <div class="property-id">ID: ${shape.id.slice(0, 8)}...</div>
            </div>
            
            ${this.buildPositionSection(shape)}
            ${this.buildDimensionSection(shape)}
            ${this.buildStyleSection(shape)}
        `;
    }

    private buildMultiShapePropertyHTML(shapes: Shape[], commonProps: any): string {
        return `
            <div class="property-header">
                <h3 class="property-title">Multiple Selection</h3>
                <div class="property-id">${shapes.length} shapes selected</div>
            </div>
            
            ${this.buildStyleSection(commonProps)}
        `;
    }

    private buildPositionSection(shape: Shape): string {
        switch (shape.type) {
            case 'rectangle':
            case 'circle':
                return `
                    <div class="property-section">
                        <label class="property-label">Position</label>
                        <div class="property-row">
                            <div class="property-field">
                                <label>X</label>
                                <input type="number" 
                                       data-property="x" 
                                       value="${shape.x}" 
                                       step="1" 
                                       class="property-input">
                            </div>
                            <div class="property-field">
                                <label>Y</label>
                                <input type="number" 
                                       data-property="y" 
                                       value="${shape.y}" 
                                       step="1" 
                                       class="property-input">
                            </div>
                        </div>
                    </div>
                `;
            case 'line':
                const line = shape as LineShape;
                return `
                    <div class="property-section">
                        <label class="property-label">Start Point</label>
                        <div class="property-row">
                            <div class="property-field">
                                <label>X1</label>
                                <input type="number" 
                                       data-property="x1" 
                                       value="${line.x1}" 
                                       step="1" 
                                       class="property-input">
                            </div>
                            <div class="property-field">
                                <label>Y1</label>
                                <input type="number" 
                                       data-property="y1" 
                                       value="${line.y1}" 
                                       step="1" 
                                       class="property-input">
                            </div>
                        </div>
                    </div>
                    <div class="property-section">
                        <label class="property-label">End Point</label>
                        <div class="property-row">
                            <div class="property-field">
                                <label>X2</label>
                                <input type="number" 
                                       data-property="x2" 
                                       value="${line.x2}" 
                                       step="1" 
                                       class="property-input">
                            </div>
                            <div class="property-field">
                                <label>Y2</label>
                                <input type="number" 
                                       data-property="y2" 
                                       value="${line.y2}" 
                                       step="1" 
                                       class="property-input">
                            </div>
                        </div>
                    </div>
                `;
            default:
                return '';
        }
    }

    private buildDimensionSection(shape: Shape): string {
        switch (shape.type) {
            case 'rectangle':
                const rect = shape as RectangleShape;
                return `
                    <div class="property-section">
                        <label class="property-label">Size</label>
                        <div class="property-row">
                            <div class="property-field">
                                <label>W</label>
                                <input type="number" 
                                       data-property="width" 
                                       value="${rect.width}" 
                                       step="1" 
                                       min="1" 
                                       class="property-input">
                            </div>
                            <div class="property-field">
                                <label>H</label>
                                <input type="number" 
                                       data-property="height" 
                                       value="${rect.height}" 
                                       step="1" 
                                       min="1" 
                                       class="property-input">
                            </div>
                        </div>
                    </div>
                `;
            case 'circle':
                const circle = shape as CircleShape;
                return `
                    <div class="property-section">
                        <label class="property-label">Size</label>
                        <div class="property-row">
                            <div class="property-field">
                                <label>Radius</label>
                                <input type="number" 
                                       data-property="radius" 
                                       value="${circle.radius}" 
                                       step="1" 
                                       min="1" 
                                       class="property-input">
                            </div>
                        </div>
                    </div>
                `;
            default:
                return '';
        }
    }

    private buildStyleSection(shape: Shape | any): string {
        const strokeColor = shape.strokeColor || shape.color || '#000000';
        const fillColor = shape.fillColor || shape.color || '#000000';
        const fillMode = shape.fillMode || 'stroke';
        const strokeStyle = shape.strokeStyle || 'solid';
        const strokeWidth = shape.strokeWidth || 2;

        return `
            <div class="property-section">
                <label class="property-label">Style</label>
                <div class="property-row">
                    <div class="property-field">
                        <label>Fill</label>
                        <input type="color" 
                               data-property="fillColor" 
                               value="${fillColor}" 
                               class="property-color-input">
                    </div>
                    <div class="property-field">
                        <label>Stroke</label>
                        <input type="color" 
                               data-property="strokeColor" 
                               value="${strokeColor}" 
                               class="property-color-input">
                    </div>
                </div>
                <div class="property-row">
                    <div class="property-field">
                        <label>Mode</label>
                        <select data-property="fillMode" class="property-select">
                            <option value="stroke" ${fillMode === 'stroke' ? 'selected' : ''}>Stroke Only</option>
                            <option value="fill" ${fillMode === 'fill' ? 'selected' : ''}>Fill Only</option>
                            <option value="both" ${fillMode === 'both' ? 'selected' : ''}>Both</option>
                        </select>
                    </div>
                    <div class="property-field">
                        <label>Line Style</label>
                        <select data-property="strokeStyle" class="property-select">
                            <option value="solid" ${strokeStyle === 'solid' ? 'selected' : ''}>Solid</option>
                            <option value="dotted" ${strokeStyle === 'dotted' ? 'selected' : ''}>Dotted</option>
                        </select>
                    </div>
                </div>
                <div class="property-row">
                    <div class="property-field">
                        <label>Width</label>
                        <select data-property="strokeWidth" class="property-select">
                            <option value="1" ${strokeWidth === 1 ? 'selected' : ''}>1px</option>
                            <option value="2" ${strokeWidth === 2 ? 'selected' : ''}>2px</option>
                            <option value="3" ${strokeWidth === 3 ? 'selected' : ''}>3px</option>
                            <option value="4" ${strokeWidth === 4 ? 'selected' : ''}>4px</option>
                            <option value="5" ${strokeWidth === 5 ? 'selected' : ''}>5px</option>
                            <option value="8" ${strokeWidth === 8 ? 'selected' : ''}>8px</option>
                            <option value="10" ${strokeWidth === 10 ? 'selected' : ''}>10px</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    private extractCommonProperties(shapes: Shape[]): any {
        if (shapes.length === 0) return {};

        const firstShape = shapes[0];
        const common: any = {};

        // Check for common style properties
        const styleProps = ['strokeColor', 'fillColor', 'fillMode', 'strokeStyle', 'strokeWidth', 'color'];
        
        styleProps.forEach(prop => {
            const firstValue = (firstShape as any)[prop];
            if (firstValue !== undefined && shapes.every(shape => (shape as any)[prop] === firstValue)) {
                common[prop] = firstValue;
            }
        });

        return common;
    }

    private getShapeTypeLabel(shape: Shape): string {
        const typeLabels = {
            rectangle: 'Rectangle',
            circle: 'Circle',
            line: 'Line',
            bezier: 'Curve'
        };
        return typeLabels[shape.type] || 'Shape';
    }

    private bindPropertyEvents(): void {
        const inputs = this.element.querySelectorAll('[data-property]');
        
        inputs.forEach(input => {
            const inputElement = input as HTMLInputElement | HTMLSelectElement;
            
            inputElement.addEventListener('input', (e) => {
                this.debouncedUpdateProperty(e);
            });

            inputElement.addEventListener('change', (e) => {
                this.debouncedUpdateProperty(e);
            });
        });
    }

    private debouncedUpdateProperty(e: Event): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = window.setTimeout(() => {
            this.updateProperty(e);
        }, 300);
    }

    private updateProperty(e: Event): void {
        const target = e.target as HTMLInputElement | HTMLSelectElement;
        const property = target.dataset.property;
        
        if (!property) return;

        let value: any = target.value;
        
        // Convert numeric values
        if (target.type === 'number') {
            value = parseFloat(value);
            if (isNaN(value)) return;
        }

        // Convert numeric strings for select elements with numeric values
        if (target.tagName === 'SELECT' && property === 'strokeWidth') {
            value = parseInt(value, 10);
        }

        this.executePropertyUpdate(property, value);
    }

    private executePropertyUpdate(property: string, value: any): void {
        if (!this.state) return;
        
        const updates: ShapePropertyUpdate[] = [];

        for (const shapeId of this.currentSelection) {
            const shape = this.state.scene.shapes.find(s => s.id === shapeId);
            if (!shape) continue;

            const oldValue = (shape as any)[property];
            if (oldValue === value) continue;

            updates.push({
                shapeId,
                oldProperties: { [property]: oldValue },
                newProperties: { [property]: value }
            });
        }

        if (updates.length > 0) {
            const command = new UpdateShapePropertiesCommand(updates);
            this.executor.execute(command, this.state, 'local');
        }
    }

    private setupEventListeners(): void {
        // Property inspector will be updated through state changes
        // No additional setup needed here as the main app will call updateSelection
    }
}
