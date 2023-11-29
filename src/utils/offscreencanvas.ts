let worker: Worker;

export function setupOffscreenCanvas(canvas: HTMLCanvasElement,
    fullCanvas: HTMLCanvasElement,
    width: number, height: number,
    fullWidth: number, fullHeight: number,
    scrWidth: number, scrHeight: number,
    alreadyTransferred: boolean): Worker {
  const values = {
    width: width,
    height: height,
    fullWidth: fullWidth,
    fullHeight: fullHeight,
    screenWidth: scrWidth,
    screenHeight: scrHeight,
  }
  // only create a web worker if we dont' have one already
  if (!worker) {
    worker = new Worker(new URL('./contentworker.ts', import.meta.url));
  }
  // if we try to transfer something twice, its an error so the caller must keep track of it
  if (!alreadyTransferred) {
    const offscreen = canvas.transferControlToOffscreen();
    const fullOffscreen = fullCanvas.transferControlToOffscreen();
    worker.postMessage({cmd: 'init', canvas: offscreen, fullCanvas: fullOffscreen, values: values}, [offscreen, fullOffscreen]);
  } else {
   worker.postMessage({cmd: 'init', values: values});
  }

  return worker;
}