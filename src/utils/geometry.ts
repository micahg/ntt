import { getRect } from "./drawing";

export interface Rect {
  x: number,
  y: number,
  width: number,
  height: number,
}

export interface ImageBound {
  left: number;
  top: number;
  width: number;
  height: number;
  rotate: boolean;
}

/**
 * Get the screen width and height, taking into consideration the offsets.
 * @returns an array of two numbers: width & height.
 */
export function getWidthAndHeight(): number[] {
  const width = Math.max(document.documentElement.clientWidth || 0,
    document.documentElement.offsetWidth || 0,
    window.innerWidth || 0)
  const height = Math.max(document.documentElement.clientHeight || 0,
     document.documentElement.offsetHeight || 0,
     window.innerHeight || 0);

  return [width, height]
}

export function getMaxContainerSize(screenWidth: number, screenHeight: number) {
  const padding = 48; // 2 * 24 vertically and horizontally
  const vOffset = (screenWidth < 600) ? 48: 64 + padding; // App Bar changes based on window width
  const hOffset = padding;
  const width = screenWidth - hOffset;
  const height = screenHeight - vOffset;
  return [width, height];
}

export function getScaledContainerSize(screenWidth: number, screenHeight: number, imageWidth: number, imageHeight: number) {
  const scale = Math.min(screenWidth / imageWidth, screenHeight / imageHeight);
  return [Math.round(imageWidth*scale), Math.round(imageHeight*scale)];
}

export function calculateBounds(canvasWidth: number, canvasHeight: number, imageWidth: number, imageHeight: number) {
  const result:ImageBound = {left: 0, top: 0, height: 0, width: 0, rotate: false};
  const wideImage: boolean = imageWidth >= imageHeight;
  const wideCanvas: boolean = canvasWidth >= canvasHeight;
  const rotate = (wideCanvas !== wideImage)

  if ((canvasWidth >= canvasHeight && imageWidth >= imageHeight) ||
      (canvasHeight > canvasWidth && imageHeight >= imageWidth)) {
    const scale = Math.min(canvasWidth / imageWidth, canvasHeight / imageHeight);
    result.width = imageWidth * scale;
    result.height = imageHeight * scale;
    result.top = (canvasHeight - result.height)/2;
    result.left = (canvasWidth - result.width)/2;
  } else {
    const scale = Math.min(canvasWidth / imageHeight, canvasHeight / imageWidth);
    result.width =  imageWidth * scale;
    result.height = imageHeight * scale;
    result.top = (canvasHeight - result.width)/2;
    result.left = (canvasWidth - result.height)/2;
    result.rotate = true;
  }

  result.rotate = rotate;
  return result;
}

/**
 * Rotate a point around the origin
 * @param angle angle of rotation
 * @param x x coordinate
 * @param y y coordinate
 * @returns the rotated point as an array of two numbers [x,y]
 */
export function rot(angle: number, x: number, y: number) {
  const r = Math.PI * (angle/180);
  const mcos = Math.round(Math.cos(r));
  const msin = Math.round(Math.sin(r));
  const xp = x*mcos - y*msin;
  const yp = x*msin + y*mcos;
  return [xp, yp]
}

/**
 * Rotate a point around the center of a rectangle
 * @param angle the angle of rotation
 * @param x the X coordinate of the point
 * @param y the Y coordinate of the point
 * @param width the width of the rectangle
 * @param height the height of the rectangle
 * @returns an array of length two, containing the rotated X and Y cordinate values
 */
export function rotate(angle: number, x: number, y: number, width: number, height: number): number[] {
  // TODO MICAH BUG look at why this gets called 1000 times on startup....
  const r = Math.PI * (angle/180);
  const c_x = width/2;
  const c_y = height/2;
  const t_x = x - c_x; // translated x
  const t_y = y - c_y; // translated y
  const mcos = Math.round(Math.cos(r));
  const msin = Math.round(Math.sin(r));

  const cosx = mcos * t_x;
  const cosy = mcos * t_y;
  const sinx = msin * t_x;
  const siny = msin * t_y;

  const x1 = cosx + siny + c_x;
  const y1 = cosy - sinx + c_y;

  return [x1, y1];
}

/**
 * Rotate a point back to the orientation of the background. This is used in
 * situations where drawing is occurring on an already rotated image.
 */
export function rotateBackToBackgroundOrientation(angle: number, x: number, y: number, w: number, h: number, ow: number, oh: number): number[] {
  /**
   * This is a modified rotration algorithm that does its final transposition
   * after rotation assuming that instead of returning to the starting point,
   * you are returning to the origin of your unrotated image based on its
   * unrotated width and height.
   */
  const d_x = x - w/2;
  const d_y = y - h/2;
  const [r_x, r_y] = rot(angle, d_x, d_y);
  const o_x = ow/2;
  const o_y = oh/2;
  return [r_x + o_x, r_y + o_y];
}



export function rotateRect(angle: number, rect: Rect, width: number, height: number) {
  let [x1, y1] = rotate(-90, rect.x, rect.y, width, height);
  let [x2, y2] = rotate(-90, rect.x + rect.width, rect.y + rect.height, width, height);
  [x1, x2] = [Math.min(x1, x2), Math.max(x1, x2)];
  [y1, y2] = [Math.min(y1, y2), Math.max(y1, y2)];
  return {x: x1, y: y1, width: x2 - x1, height: y2 - y1};
}

/**
 * If you were to rotate a rectangle around its own center, get the width and
 * heigh it would occupy.
 * @param angle angle of rotation
 * @param width rectangle width
 * @param height rectangle heigh
 * @returns an array 
 */
export function rotatedWidthAndHeight(angle: number, width: number, height: number) {
  //https://stackoverflow.com/questions/69963451/how-to-get-height-and-width-of-element-when-it-is-rotated/69966021#69966021
  const r = Math.PI * (angle/180);
  const cos = Math.round(Math.cos(r));
  const sin = Math.round(Math.sin(r));
  const h = Math.abs((width * sin) + (height * cos));
  const w = Math.abs((height * sin) + (width * cos));
  return [w,h];
}

export function scaleSelection(selection: Rect, viewport: Rect, width: number, height: number) {
  const v_w = viewport.width - viewport.x;
  const v_h = viewport.height - viewport.y;
  const h_scale = width/v_w;
  const v_scale = height/v_h;
  return {
    x: selection.x * h_scale, y: selection.y * v_scale,
    width: selection.width * h_scale, height: selection.height * v_scale,
  };
}

/**
 * rotate and fill viewport to fit screen/window/canvas
 * @param screen screen [width, height]
 * @param image image [width, height] (actual)
 * @param oImage iamge [width, height] (original)
 * @param angle angle of rotation
 * @param viewport viewport {x, y, w, h}
 * @returns 
 */
export function rotateAndFillViewport(screen: number[], image: number[], oImage: number[], angle: number, viewport: Rect) {
  const [iW, iH] = image;
  const [oW, oH] = oImage
  if (viewport.x === 0 && viewport.y === 0 && viewport.width === oW && viewport.height === oH) {
    return getRect(0, 0, iW, iH);
  }

  // calculate coefficient for browser-resized images
  // We shouldn't need to square (**2) the scaling value; however, I
  // think due to a browser bug, squaring silkScale below is what works.
  // FWIW, the bug was filed here:
  // https://bugs.chromium.org/p/chromium/issues/detail?id=1494756
  const silkScale = (iW/oW)**2;
  // const p1 = viewport

  return silkScale;
}

/**
 * Pay attention!!! This method should decide how much of the background image
 * to render, considering the following things zoom of the table and that the
 * image may be reduced in size by the browser.
 * 
 * @param selection the selection (rectangle) over the background.
 * @param tableBGRect the background size according to the table state.
 * @param width the actual background width
 * @param height the actual background height
 * @param zoomed the result of checking seledction and tableBGRect with isZoomed
 * @returns 
 */
export function fillToAspect(selection: Rect | null, tableBGRect: Rect, width: number, height: number) {
  if (!selection) return getRect(0, 0, width, height);

  // We need to remember that some browsers (Amazon Silk on a firestick) MAY
  // shrink your image without telling you (probably due to ram constraints on
  // big images). In such situations (all situations consequently) we need to
  // consider the original size at the editor (which is passed in bg)
  if (selection.x === 0 && selection.y === 0 && selection.width === tableBGRect.width && selection.height === tableBGRect.height) {
    return getRect(0, 0, width, height);
  }

  const [screenWidth, screenHeight] = getWidthAndHeight();
  
  const selR = selection.width / selection.height
  const scrR = (tableBGRect.width > tableBGRect.height) ? screenWidth/screenHeight : screenHeight/screenWidth;

  // calculate coefficient for browser-resized images
  // We shouldn't need to square (**2) the scaling value; however, I
  // think due to a browser bug, squaring silkScale below is what works.
  // FWIW, the bug was filed here:
  // https://bugs.chromium.org/p/chromium/issues/detail?id=1494756
  const silkScale = (width/tableBGRect.width)**2;

  // if the selection ratio is greater than the screen ratio it implies
  // aspect ratio of the selection is wider than the aspect ratio of the
  // screen, so the height can be scaled up to match the screen/image ratio
  if (selR >= scrR) {
    const newHeight = selection.width / scrR;
    let newY = selection.y -((newHeight - selection.height)/2);

    // these bits ensure we render from the edge rather than show black
    if (newY < 0) newY = 0;
    if (newY + newHeight > tableBGRect.height) newY = tableBGRect.height - newHeight;
    if (silkScale === 1)
      return {x: selection.x, y: newY, width: selection.width, height: newHeight};

    return {x: selection.x * silkScale, y: newY * silkScale,
            width: selection.width * silkScale, height: newHeight * silkScale};
  }

  // conversly, if the selection ratio is less than the screen ratio, it implies
  // that the aspect ratio of the selection is less than the aspect ratio of the
  // screen, so the width can be scaled up to match the screen/image ratio
  const newWidth = scrR * selection.height;
  let newX = selection.x - ((newWidth - selection.width)/2);

  // these bits ensure we render from the edge rather than show black
  if (newX < 0) newX = 0;
  if (newX + newWidth > tableBGRect.width) newX = tableBGRect.width - newWidth;

  if (silkScale === 1)
    return {x: newX, y: selection.y, width: newWidth, height: selection.height}
  return {x: newX * silkScale, y: selection.y * silkScale,
          width: newWidth * silkScale, height: selection.height * silkScale}
}