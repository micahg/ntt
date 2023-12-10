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

export function cb(canvasWidth: number, canvasHeight: number, imageWidth: number, imageHeight: number) {
  const cr = canvasWidth/canvasHeight;
  const ir = imageWidth/imageHeight;
  if (cr > ir) { // canvas aspect wider than image aspect
    const w = Math.round(canvasHeight * ir);
    const l = (canvasWidth - w)/2;
    return {x: l, y: 0, width: w, height: canvasHeight};
  }
  const h = Math.round(canvasWidth/ir);
  const t = (canvasHeight - h)/2;
  return {x: 0, y: t, width: canvasWidth, height: h};
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
  // TODO round the return, chump
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
// export function rotate(angle: number, x: number, y: number, width: number, height: number): number[] {
//   // TODO MICAH BUG look at why this gets called 1000 times on startup....
//   const r = Math.PI * (angle/180);
//   const c_x = width/2;
//   const c_y = height/2;
//   const t_x = x - c_x; // translated x
//   const t_y = y - c_y; // translated y
//   const mcos = Math.round(Math.cos(r));
//   const msin = Math.round(Math.sin(r));

//   const cosx = mcos * t_x;
//   const cosy = mcos * t_y;
//   const sinx = msin * t_x;
//   const siny = msin * t_y;

//   const x1 = cosx + siny + c_x;
//   const y1 = cosy - sinx + c_y;

//   return [x1, y1];
// }

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



// export function rotateRect(angle: number, rect: Rect, width: number, height: number) {
//   let [x1, y1] = rotate(-90, rect.x, rect.y, width, height);
//   let [x2, y2] = rotate(-90, rect.x + rect.width, rect.y + rect.height, width, height);
//   [x1, x2] = [Math.min(x1, x2), Math.max(x1, x2)];
//   [y1, y2] = [Math.min(y1, y2), Math.max(y1, y2)];
//   return {x: x1, y: y1, width: x2 - x1, height: y2 - y1};
// }

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
 * @param image image [width, height] (actual -- might get shrunk by browser)
 * @param oImage image [width, height] (original -- as the editor saw it -- possibly shrunk but we dont' handle that yet)
 * @param angle angle of rotation
 * @param viewport viewport withing the original image {x, y, w, h}
 * @returns 
 */
export function rotateAndFillViewport(screen: number[], image: number[], oImage: number[], angle: number, viewport: Rect) {
  if (viewport.x === 0 && viewport.y === 0 && viewport.width === oImage[0] && viewport.height === oImage[1]) {
    return getRect(0, 0, image[0], image[1]);
  }
  const rScreen = rotatedWidthAndHeight(angle, screen[0], screen[1]);
  const selR = viewport.width / viewport.height;
  const scrR = rScreen[0]/rScreen[1];
  let { x, y, width: w, height: h } = viewport;

  // const newVP = { x: viewport.x, y: viewport.y, width: viewport.width, height: viewport.height };
  if (scrR > selR) {
    const offset = Math.round(((h * scrR) - w)/2);
    w = Math.round(h * scrR);
    if (x - offset < 0) x = 0; // shunt to left screen bound rather than render a partial image
    else if (x + w > oImage[0]) x = oImage[0] - w; // shunt to right screen bound rather than render a partial image
    else x -= offset;
  } else {
    const offset = Math.round(((w/scrR) - h)/2);
    h = Math.round(w/scrR);
    if (y - offset < 0) y = 0;
    else if (y + h + offset > oImage[1]) y = oImage[1] - h;
    else y -= offset;
  }
  // calculate coefficient for browser-resized images
  // We shouldn't need to square (**2) the scaling value; however, I
  // think due to a browser bug, squaring silkScale below is what works.
  // FWIW, the bug was filed here:
  // https://bugs.chromium.org/p/chromium/issues/detail?id=1494756
  const silkScale = (image[0]/oImage[0])**2;
  return {x: x * silkScale, y: y * silkScale, width: w * silkScale, height: h * silkScale};
}

export function oldRotateAndFillViewport(screen: number[], image: number[], oImage: number[], angle: number, viewport: Rect) {
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

  // translate to origin
  const d_x1 = viewport.x - oW/2;
  const d_y1 = viewport.y - oH/2;
  const d_x2 = (viewport.x + viewport.width) - oW/2;
  const d_y2 = (viewport.y + viewport.height) - oH/2;

  // rotate both points around the center
  const [r_x1, r_y1] = rot(angle, d_x1, d_y1);
  const [r_x2, r_y2] = rot(angle, d_x2, d_y2);

  // rotate the entire image dimensions
  const [rW, rH] = rotatedWidthAndHeight(angle, iW, iH);
  const o_x = rW/2;
  const o_y = rH/2;

  // translate both points away from rotated origin
  let [x1, y1] = [r_x1 + o_x, r_y1 + o_y];
  let [x2, y2] = [r_x2 + o_x, r_y2 + o_y];

  // keep x1,y1 the smaller value to prevent natives
  [x1, x2] = [Math.min(x1, x2), Math.max(x1, x2)];
  [y1, y2] = [Math.min(y1, y2), Math.max(y1, y2)];
  let [v_RW, v_RH] = [x2 - x1, y2 - y1];


  // if the selection ratio is greater than the screen ratio it implies
  // aspect ratio of the selection is wider than the aspect ratio of the
  // screen, so the height can be scaled up to match the screen/image ratio
  const selR = v_RW / v_RH;
  const scrR = screen[0]/screen[1];
  if (scrR > selR) {
    const offset = Math.round(((v_RW * scrR) - v_RW)/2);
    v_RW = Math.round(v_RW * scrR);
    if (x1 - offset < 0) x1 = 0; // shunt to left screen bound rather than render a partial image
    else if (x2 + offset > rW) x1 = rW - v_RW; // shunt to right screen bound rather than render a partial image
    else x1 -= offset;
  } else {
    const offset = Math.round(((v_RW/scrR) - v_RH)/2);
    v_RH = Math.round(v_RW/scrR);
    if (y1 - offset < 0) y1 = 0;
    else if (y2 + offset > rH) y1 = rH - v_RH;
    else y1 -= offset;
  }

  const rV = {x: x1 * silkScale, y: y1 * silkScale,
    width: v_RW * silkScale, height: v_RH * silkScale};

  return rV;
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