import type { State } from '../state';

export class PanTool {
    private isPanning = false;
    private startX = 0;
    private startY = 0;

    handleMouseDown(e: MouseEvent, state: State): boolean {
        if (e.button === 0 && state.tool === 'pan') {
            this.isPanning = true;
            this.startX = e.clientX - state.view.panX;
            this.startY = e.clientY - state.view.panY;
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

    handleMouseUp(): boolean {
        if (this.isPanning) {
            this.isPanning = false;
            return true;
        }
        return false;
    }

    isPanningActive(): boolean {
        return this.isPanning;
    }
}
