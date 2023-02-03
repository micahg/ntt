import { calculateBounds } from "./geometry";

export const IMG_URI: string = 'map-gnomegarde-pc.jpg';
export const CONTROLS_HEIGHT = 46;

/**
 * Load an image.
 * @param uri the URI of the image to load
 * @returns a promise that resolves to an HTMLImageElement
 */
export function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.id = 'mapImage'
    img.onload = function() { resolve(this as HTMLImageElement); }
    img.onerror = function() { reject('Image load failed'); }
    img.src = uri;
  });
}

export function renderImage(image: HTMLImageElement, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Promise<void> {

  const width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
  const height = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0) - CONTROLS_HEIGHT;

  console.log(`Image  is ${image.width} x ${image.height}`);
  console.log(`Window is ${width} x ${height}`);
  console.log(`Adjusted window is ${width} x ${height}`)

  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  if (!ctx) return Promise.reject(`Unable to get canvas context`);

  let bounds = calculateBounds(canvas.width, canvas.height, image.width, image.height);
  console.log(`Scaled Image is ${bounds.width} x ${bounds.height}`)
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width/2, canvas.height/2);
  if (bounds.rotate) {
    ctx.rotate(90 * Math.PI/180);
  }
  ctx.drawImage(image, -bounds.width/2, -bounds.height/2, bounds.width, bounds.height);
  ctx.restore();

  return Promise.resolve();
}

export function setupOverlayCanvas(background: HTMLCanvasElement, overlay: HTMLCanvasElement, overlayCtx: CanvasRenderingContext2D): Promise<void> {
  overlay.width = background.width;
  overlay.height = background.height;
  overlay.style.width = `${background.width}px`;
  overlay.style.height = `${background.height}px`;
  overlayCtx.save();
  return Promise.resolve();
}