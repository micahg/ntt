let worker: Worker;

export function setupOffscreenCanvas(backgroundCanvas: HTMLCanvasElement,
    overlayCanvas: HTMLCanvasElement,
    fullOverlayCanvas: HTMLCanvasElement,
    alreadyTransferred: boolean,
    screenWidth: number, screenHeight: number,
    background?: string, overlay?: string): Worker {
  const values = {
    screenWidth: screenWidth,
    screenHeight: screenHeight,
    overlay: overlay,
    background: background,
  }
  // only create a web worker if we dont' have one already
  if (!worker) {
    worker = new Worker(new URL('./contentworker.ts', import.meta.url));
  }
  // if we try to transfer something twice, its an error so the caller must keep track of it
  if (!alreadyTransferred) {
    const background = backgroundCanvas.transferControlToOffscreen();
    const overlay = overlayCanvas.transferControlToOffscreen();
    const fullOverlay = fullOverlayCanvas.transferControlToOffscreen();
    worker.postMessage({cmd: 'init', background: background, overlay: overlay, fullOverlay: fullOverlay, values: values}, [background, overlay, fullOverlay]);
  } else {
   worker.postMessage({cmd: 'init', values: values});
  }

  return worker;
}