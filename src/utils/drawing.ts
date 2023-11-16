import { calculateBounds, getWidthAndHeight, ImageBound, Rect } from "./geometry";

export const CONTROLS_HEIGHT = 46;
// let baseData: ImageData | null = null;
let worker: Worker;

export function getRect(x1: number, y1: number, x2: number, y2: number): Rect {
  let x: number;
  let y: number;
  let w: number;
  let h: number;
  if (x1 > x2) {
    x = x2;
    w = x1-x2;
  } else {
    x = x1;
    w = x2 - x1;
  }
  if (y1 > y2) {
    y = y2;
    h = y1 - y2;
  } else {
    y = y1;
    h = y2 - y1;
  }
  return { x: x, y: y, width: w, height: h};
}
/**
 * Load an image.
 * @param uri the URI of the image to load
 * @returns a promise that resolves to an HTMLImageElement
 */
export function loadImage(uri: string): Promise<HTMLImageElement> {
  const img = new Image();
  return new Promise((resolve, reject) => {
    img.onload = function() {
      // just to mess with stuff silk (amazon browser) will resize us here,
      // to 1.599905190803508 smaller, screwing up our viewports. Its
      // probably a ram constraint...
      resolve(this as HTMLImageElement);
    }
    img.onerror = function(error) { reject(error); }
    // Anonymous only works if the server cors are setup... Setting it avoids the
    // error:
    //
    //    The canvas has been tainted by cross-origin data.
    //
    // from happening when we (later) call getImageData on the overlay BUT have
    // loaded the overlay with an existing image from localhost:3000. The problem
    // originates from the fact that our frontend in dev is on localhost:4200 and
    // I don't think cross-origin is setup properly for static data on the nose
    // server
    img.crossOrigin = 'Anonymous';
    img.src = uri;
  });
}

export function renderImageInContainer(image: HTMLImageElement, ctx: CanvasRenderingContext2D,
  resizeCanvas = false) {

  if (resizeCanvas) {
    const [windowWidth, windowHeight] = getWidthAndHeight();
    const padding = 48; // 2 * 24 vertically and horizontally
    const vOffset = (windowWidth < 600) ? 48: 64 + padding; // App Bar changes based on window width
    const hOffset = padding;
    const width = windowWidth - hOffset;
    const height = windowHeight - vOffset;
    // TODO stop calcualting bounds twice
    const adjusted = calculateBounds(width, height, image.width, image.height);
    ctx.canvas.width = adjusted.rotate ? adjusted.height : adjusted.width;
    ctx.canvas.height = adjusted.rotate ? adjusted.width : adjusted.height;
    ctx.canvas.style.width = `${ctx.canvas.width}px`;
    ctx.canvas.style.height = `${ctx.canvas.height}px`;
  }

  return renderImage(image, ctx);
}

export function renderImageFullScreen(image: HTMLImageElement, ctx: CanvasRenderingContext2D,
  viewport: Rect | null = null) {
  if (!ctx) return Promise.reject(`Unable to get canvas context`);

  /**
   * Something to remember: the offsetWidth/offsetHeight is used by amazon silk.
   * On silk the client is 960*480 but the offset is 960*540. The actual
   * available screen is indeed 960*540 BUT you only get it by scrolling the
   * screen down
   */
  const [width, height] = getWidthAndHeight();
  ctx.canvas.width = width;
  ctx.canvas.height = height;
  ctx.canvas.style.width = `${width}px`;
  ctx.canvas.style.height = `${height}px`;

  return renderImage(image, ctx, viewport);
}

function renderImage(image: HTMLImageElement, ctx: CanvasRenderingContext2D,
  viewport: Rect | null = null): ImageBound {

  // if we're zoomed we should use viewport width and height (not image)
  const [width, height] = viewport ? [viewport.width, viewport.height] : [image.width, image.height];
  const bounds = calculateBounds(ctx.canvas.width, ctx.canvas.height, width, height);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2);
  if (bounds.rotate) {
    ctx.rotate(90 * Math.PI/180);
  }
  if (viewport != null) {
    ctx.drawImage(image,
      viewport.x, viewport.y, viewport.width, viewport.height,
      -bounds.width/2, -bounds.height/2, bounds.width, bounds.height);  
  } else {
    ctx.drawImage(image, -bounds.width/2, -bounds.height/2, bounds.width, bounds.height);
  }
  ctx.restore();
  return bounds;
}

// TODO MICAH MOVE THIS SOON -- we can basically cut this entire file by moving the worker into the content editor.
export function setupOffscreenCanvas(canvas: HTMLCanvasElement,
                                     fullCanvas: HTMLCanvasElement,
                                     width: number, height: number,
                                     fullWidth: number, fullHeight: number) {
  // TODO when there is nothing left https://github.com/webpack-contrib/worker-loader#integrating-with-typescript
  // can't do this more than once
  const values = {
    width: width,
    height: height,
    fullWidth: fullWidth,
    fullHeight: fullHeight,
  }
  if (!worker) {
    worker = new Worker("worker.js");
    const offscreen = canvas.transferControlToOffscreen();
    const fullOffscreen = fullCanvas.transferControlToOffscreen();
    worker.postMessage({cmd: 'init', canvas: offscreen, fullCanvas: fullOffscreen, values: values}, [offscreen, fullOffscreen]);
  } else {
    worker.postMessage({cmd: 'init', values: values});
  }
}

export function setOverlayOpacity(opacity: string) {
  worker.postMessage({cmd: 'opacity', opacity: opacity});
}

export function setOverlayColour(colour: string) {
  const [red, green, blue] = [parseInt(colour.slice(1, 3), 16).toString(),
                        parseInt(colour.slice(3, 5), 16).toString(),
                        parseInt(colour.slice(5, 7), 16).toString()];
  worker.postMessage({cmd: 'colour', red: red, green: green, blue: blue});
}

export function obscureOverlay() {
  // if (baseData === null) return;
  // this.putImageData(baseData, 0, 0);
  // this.fillStyle = `rgba(${red}, ${green}, ${blue}, ${opacity})`;
  // this.fillRect(x1,y1,x2-x1,y2-y1);
  // baseData = this.getImageData(0, 0, this.canvas.width, this.canvas.height);
  worker.postMessage({cmd: 'obscure'});
}

export function revealOverlay() {
  // if (baseData === null) return;
  // this.putImageData(baseData, 0, 0);
  // this.clearRect(x1,y1,x2-x1,y2-y1);
  // baseData = this.getImageData(0, 0, this.canvas.width, this.canvas.height);
  // OSCtx.putImageData(baseData, 0, 0);
  worker.postMessage({cmd: 'reveal'});
}


/**
 * Store off the default overlay image data. When using this method, you must
 * bind the context to it because "this" is expected to be a 2D context. Note
 * that unless the base data was originally set to null, we wont update to
 * prevent blowing up overlay data after its been updated.
 * 
 * @param this the overlay canvas context from which to store the image data.
 */
export function storeOverlay(this: any) {
  // if (baseData !== null) return;
  // baseData = this.getImageData(0, 0, this.canvas.width, this.canvas.height);
  // setOverlayAsBaseData();
  // worker.postMessage({cmd: 'record', x: this.startX, y: this.startY});
}

/**
 * Use the current overlay data as base data. This works (or is supposed to
 * work) in tandem with storeOverlay. Its used in the case where we start with
 * overlay data and we don't want to keep the blank overlay data that would
 * have been set when the canvas is initialized... in theory
 * @param ctx 
 */
export function setOverlayAsBaseData(ctx?: CanvasRenderingContext2D) {
  // baseData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
}

/**
 * Render a selection on a canvas context. When using this method, you must
 * bind the context to it because "this" is expected to be a 2D context.
 * 
 * @param this the overlay canvas context upon which to render a selection.
 * @param x1 the first x coordinate
 * @param y1 the first y coordinate
 * @param x2 the second x coordinate
 * @param y2 teh second y coordinate
 */
export function selectOverlay(x1: number, y1: number, x2: number, y2: number) {
  // if (baseData === null) return;
  // this.putImageData(baseData, 0, 0);
  // this.fillStyle = "rgba(255, 255, 255, 0.25)";
  // this.fillRect(x1,y1,x2-x1,y2-y1);  
  worker.postMessage({cmd: 'record', x1: x1, y1: y1, x2: x2, y2: y2});
}

export function clearSelection() {
  worker.postMessage({cmd: 'clearselection'});
}

export function selectOverlayEnd() {
  worker.postMessage({cmd: 'endrecording'});
}

export function clearOverlay() {
  // ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  // ctx.save();
  // baseData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  worker.postMessage({cmd: 'clear'});
}

export function loadOverlay(url: string) {
  // const img = new Image();
  // img.addEventListener('load', () => {worker.postMessage({cmd: 'load', img: img}, [img])});
  // img.src = url;
  worker.postMessage({cmd: 'load', url: url});
}