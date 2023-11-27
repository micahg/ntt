let worker: Worker;

export function setupOffscreenCanvas(canvas: HTMLCanvasElement,
    fullCanvas: HTMLCanvasElement,
    width: number, height: number,
    fullWidth: number, fullHeight: number,
    alreadyTransferred: boolean): Worker {
  // TODO when there is nothing left https://webpack.js.org/guides/web-workers/
  // can't do this more than once
  const values = {
    width: width,
    height: height,
    fullWidth: fullWidth,
    fullHeight: fullHeight,
  }
  if (!worker) {
    worker = new Worker("worker.js"); // this lives with the other public assets
  }
  if (!alreadyTransferred) {
    const offscreen = canvas.transferControlToOffscreen();
    const fullOffscreen = fullCanvas.transferControlToOffscreen();
    worker.postMessage({cmd: 'init', canvas: offscreen, fullCanvas: fullOffscreen, values: values}, [offscreen, fullOffscreen]);
  } else {
   worker.postMessage({cmd: 'init', values: values});
  }

  return worker;
}