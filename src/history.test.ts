// Basic unit tests for the history system
// This demonstrates testing the command pattern implementation

import { HistoryManager, AddShapeCommand, PanCommand } from './history';
import { initialState } from './state';
import { generateId, resetIdCounter } from './constants';

// Mock state for testing
function createTestState() {
    return {
        scene: { shapes: [] },
        view: { panX: 0, panY: 0, zoom: 1 },
        tool: 'pan' as const,
        currentDrawing: { shape: null, type: null },
        selection: null
    };
}

// Test HistoryManager
function testHistoryManager() {
    console.log('Testing HistoryManager...');
    
    const history = new HistoryManager(5); // Small capacity for testing
    const state = createTestState();
    
    // Test initial state
    console.assert(!history.canUndo(), 'Should not be able to undo initially');
    console.assert(!history.canRedo(), 'Should not be able to redo initially');
    
    // Test adding a shape
    const shape = {
        id: generateId(),
        type: 'rectangle' as const,
        color: '#f00',
        x: 10,
        y: 10,
        width: 20,
        height: 20
    };
    
    const addCommand = new AddShapeCommand(shape);
    history.push(addCommand, state);
    
    console.assert(state.scene.shapes.length === 1, 'Shape should be added');
    console.assert(history.canUndo(), 'Should be able to undo after adding');
    console.assert(!history.canRedo(), 'Should not be able to redo after new command');
    
    // Test undo
    history.undo(state);
    console.assert(state.scene.shapes.length === 0, 'Shape should be removed after undo');
    console.assert(!history.canUndo(), 'Should not be able to undo after undoing all');
    console.assert(history.canRedo(), 'Should be able to redo after undo');
    
    // Test redo
    history.redo(state);
    console.assert(state.scene.shapes.length === 1, 'Shape should be restored after redo');
    console.assert(history.canUndo(), 'Should be able to undo after redo');
    console.assert(!history.canRedo(), 'Should not be able to redo after redoing all');
    
    console.log('✓ HistoryManager tests passed');
}

// Test PanCommand merging
function testPanCommandMerging() {
    console.log('Testing PanCommand merging...');
    
    const history = new HistoryManager();
    const state = createTestState();
    
    // Add first pan command
    const pan1 = new PanCommand(10, 5);
    history.push(pan1, state);
    
    console.assert(state.view.panX === 10 && state.view.panY === 5, 'First pan should be applied');
    
    // Add second pan command (should merge)
    const pan2 = new PanCommand(5, 3);
    history.push(pan2, state);
    
    console.assert(state.view.panX === 15 && state.view.panY === 8, 'Second pan should be merged');
    
    const histSize = history.getHistorySize();
    console.assert(histSize.past === 1, 'Should have only one command in history due to merging');
    
    // Test undo merged command
    history.undo(state);
    console.assert(state.view.panX === 0 && state.view.panY === 0, 'Undo should revert both pans');
    
    console.log('✓ PanCommand merging tests passed');
}

// Test capacity limit
function testCapacityLimit() {
    console.log('Testing capacity limit...');
    
    const history = new HistoryManager(3); // Very small capacity
    const state = createTestState();
    
    // Add more commands than capacity
    for (let i = 0; i < 5; i++) {
        const shape = {
            id: generateId(),
            type: 'circle' as const,
            color: '#00f',
            x: i * 10,
            y: i * 10,
            radius: 5
        };
        const command = new AddShapeCommand(shape);
        history.push(command, state);
    }
    
    const histSize = history.getHistorySize();
    console.assert(histSize.past <= 3, 'History should not exceed capacity');
    console.assert(state.scene.shapes.length === 5, 'All shapes should still be in scene');
    
    console.log('✓ Capacity limit tests passed');
}

// Run all tests
export function runHistoryTests() {
    console.log('Running history system tests...');
    resetIdCounter(); // Reset for deterministic IDs
    
    try {
        testHistoryManager();
        testPanCommandMerging();
        testCapacityLimit();
        console.log('✅ All history tests passed!');
        return true;
    } catch (error) {
        console.error('❌ History tests failed:', error);
        return false;
    }
}

// Auto-run tests in development
if (import.meta.env.DEV) {
    runHistoryTests();
}
