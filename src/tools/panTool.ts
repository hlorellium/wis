import type { State } from '../state';
import { HistoryManager, PanCommand } from '../history';

export class PanTool {
    private isPanning = false;
    private startX = 0;
    private startY = 0;
    private startPanX = 0;
    private startPanY = 0;
    private history: HistoryManager;

    constructor(history: HistoryManager) {
        this.history = history;
    }

    handleMouseDown(e: MouseEvent, state: State): boolean {
        if (e.button === 0 && state.tool === 'pan') {
            this.isPanning = true;
            this.startX = e.clientX - state.view.panX;
            this.startY = e.clientY - state.view.panY;
            this.startPanX = state.view.panX;
            this.startPanY = state.view.panY;
            return true;
        }
        return false;
    }

    handleMouseMove(e: MouseEvent, state: State): boolean {
        if (this.isPanning) {
            state.view.panX = e.clientX - this.startX;
            state.view.panY = e.clientY - this.startY;
            return true;
        }
        return false;
    }

    handleMouseUp(state: State): boolean {
        if (this.isPanning) {
            this.isPanning = false;
            
            // Calculate the delta and create a command if there was actual movement
            const deltaX = state.view.panX - this.startPanX;
            const deltaY = state.view.panY - this.startPanY;
            
            if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
                // Reset to start position first
                state.view.panX = this.startPanX;
                state.view.panY = this.startPanY;
                
                // Then apply the pan command
                const command = new PanCommand(deltaX, deltaY);
                this.history.push(command, state);
            }
            
            return true;
        }
        return false;
    }

    isPanningActive(): boolean {
        return this.isPanning;
    }
}
