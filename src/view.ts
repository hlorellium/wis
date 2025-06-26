// import type { State } from "./state";
//
// export function setupView(canvasContainer: HTMLDivElement): {
//     updateTransform: (state: State) => void;
// } {
//     return {
//         updateTransform: (state: State) => {
//             updateTransform(canvasContainer, state)
//         }
//     };
// }
//
// function updateTransform(canvasContainer: HTMLDivElement, state: State) {
//     canvasContainer.style.setProperty('--pan-x', state.view.panX + 'px');
//     canvasContainer.style.setProperty('--pan-y', state.view.panY + 'px');
//     canvasContainer.style.setProperty('--zoom', state.view.zoom.toString());
// }
