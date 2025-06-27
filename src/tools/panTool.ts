import type { State } from "../state";
import { HistoryManager, PanCommand } from "../history";
import { HISTORY_CONFIG } from "../constants";

export class PanTool {
  private isPanning = false;
  private startX = 0;
  private startY = 0;
  private startPanX = 0;
  private startPanY = 0;
  private history: HistoryManager;
  private onHistoryChange?: () => void;
  private rafId: number | null = null;

  constructor(history: HistoryManager, onHistoryChange?: () => void) {
    this.history = history;
    this.onHistoryChange = onHistoryChange;
  }

  handleMouseDown(e: MouseEvent, state: State): boolean {
    if (e.button === 0 && state.tool === "pan") {
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

      if (
        Math.abs(deltaX) > HISTORY_CONFIG.PAN_THRESHOLD ||
        Math.abs(deltaY) > HISTORY_CONFIG.PAN_THRESHOLD
      ) {
        // Reset to start position first
        state.view.panX = this.startPanX;
        state.view.panY = this.startPanY;

        // Then apply the pan command
        const command = new PanCommand(deltaX, deltaY);
        this.history.push(command, state);
        this.onHistoryChange?.();
      }

      return true;
    }
    return false;
  }

  isPanningActive(): boolean {
    return this.isPanning;
  }
}
