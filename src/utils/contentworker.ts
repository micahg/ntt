import {
  Rect,
  firstZoomStep,
  getScaledContainerSize,
  rot,
  rotateBackToBackgroundOrientation,
  rotatedWidthAndHeight,
} from "./geometry";

/**
 * Worker for offscreen drawing in the content editor.
 */
let backgroundImage: ImageBitmap;
let overlayImage: ImageBitmap;
let backgroundCanvas: OffscreenCanvas;
let backgroundCtx: OffscreenCanvasRenderingContext2D;
let overlayCanvas: OffscreenCanvas;
let overlayCtx: OffscreenCanvasRenderingContext2D;
let fullOverlayCanvas: OffscreenCanvas;
let fullCtx: OffscreenCanvasRenderingContext2D;
let recording = false;
let selecting = false;
let panning = false;
let buff: ImageData;
let fullBuff: ImageData;
let _angle: number;
let _zoom: number;
const _zoom_step = 0.5;
let _max_zoom: number;
let _first_zoom_step: number;

// canvas width and height (sent from main thread)
let _canvasW: number;
let _canvasH: number;

// canvas width but unrotated (used for calculating)
let _unrotCanvasW: number;
let _unrotCanvasH: number;

// region of images to display
let _imgX = 0;
let _imgY = 0;
let _imgW: number;
let _imgH: number;

// viewport
let _vpW: number;
let _vpH: number;

// rotated image width and height - cached to avoid recalculation after load
let _fullRotW: number;
let _fullRotH: number;

let _scaleW: number;
let _scaleH: number;
let _scaleOriginW: number;
let _scaleOriginH: number;

let startX: number, startY: number, endX: number, endY: number;
let lastAnimX = -1;
let lastAnimY = -1;
let scale: number;

let opacity = "1";
let red = "255";
let green = "0";
let blue = "0";

function trimPanning() {
  if (_imgX <= 0) _imgX = 0;
  if (_imgY <= 0) _imgY = 0;

  // if viewport > image then panning gets weird
  if (_imgW >= backgroundImage.width) _imgX = 0;
  else if (_imgX + _imgW > backgroundImage.width)
    _imgX = backgroundImage.width - _imgW;
  if (_imgH >= backgroundImage.height) _imgY = 0;
  else if (_imgY + _imgH > backgroundImage.height)
    _imgY = backgroundImage.height - _imgH;
}

function renderImage(
  ctx: OffscreenCanvasRenderingContext2D,
  img: ImageBitmap,
  angle: number,
) {
  /**
   * math! | (• ◡•)| (❍ᴥ❍ʋ)
   *
   * Zoomed out we just base the canvas size off the image size with rotation applied. Hence,
   * we render img.width and img.height when full zoomed out - the canvas already compensates.
   *
   * Zoomed in is a little more complicated.  Our zoom factor is based on the canvas size. 1
   * means we're fully zoomed in (1:1 pixel scale) and less zooms out to a max of either the
   * width or height of the image (whichever fits first)
   */

  // if (debug) {
  // console.log(`*****`);
  // console.log(`translate ${ctx.canvas.width / 2}, ${ctx.canvas.height / 2}`);
  // console.log(
  //   `draw ${_imgX}, ${_imgY}, ${_imgW}, ${_imgH}, ${-_vpW / 2}, ${
  //     -_vpH / 2
  //   }, ${_vpW}, ${_vpH}`,
  // );
  // console.log(`*****`);
  // }

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.drawImage(
    img,
    // we ctx.rotate above, so REMEMBER: the actual source image SHOULD NOT BE ROTATED
    _imgX,
    _imgY,
    _imgW,
    _imgH,
    // the viewport, on the other hand, does need to accommodate that rotation since
    // we are on a mostly statically sized canvas but width and height might be rotated
    -_vpW / 2,
    -_vpH / 2,
    _vpW,
    _vpH,
  );
  ctx.restore();
}

function loadImage(url: string): Promise<ImageBitmap> {
  return fetch(url)
    .then((resp) => resp.blob())
    .then((blob) => createImageBitmap(blob));
}

function calculateCanvasses(
  angle: number,
  width: number,
  height: number,
  containerWidth: number,
  containerHeight: number,
) {
  // rotate the full sized hidden canvas (holds the full-sized overlay)
  [_fullRotW, _fullRotH] = rotatedWidthAndHeight(angle, width, height);
  [_unrotCanvasW, _unrotCanvasH] = rotatedWidthAndHeight(
    -angle,
    containerWidth,
    containerHeight,
  );
  console.log(`_unrotCanvasH = ${_unrotCanvasH}`);
  console.log(`_unrotCanvasW = ${_unrotCanvasW}`);

  // scale the rotated full size image down be contained within our container bounds
  const [scaleContW, scaleContH] = getScaledContainerSize(
    containerWidth,
    containerHeight,
    _fullRotW,
    _fullRotH,
  );

  // rotate backwards to get the original height/width scaled down (we need it to drawImage)
  const [scaleW, scaleH] = rotatedWidthAndHeight(
    -angle,
    scaleContW,
    scaleContH,
  );

  // calculate pre-rotation scale
  scale = width / _unrotCanvasW;

  _scaleOriginW = scaleW;
  _scaleOriginH = scaleH;
  _scaleW = scaleContW;
  _scaleH = scaleContH;

  console.log(`_scaleW = ${_scaleW}`);
  console.log(`_scaleH = ${_scaleH}`);
  console.log(`_scaleOriginW = ${_scaleOriginW}`);
  console.log(`_scaleOriginH = ${_scaleOriginH}`);

  // [_rvpW, _rvpH] = [scaleW, scaleH];
  // [_vpW, _vpH] = [width, height];
  return;
}

function calculateViewport(
  angle: number,
  zoom: number,
  containerWidth: number,
  containerHeight: number,
) {
  const [cw, ch] = [containerWidth, containerHeight];
  [_vpW, _vpH] = rotatedWidthAndHeight(-angle, cw, ch);
  [_imgW, _imgH] = [zoom * _vpW, zoom * _vpH];
  if (_imgW > backgroundImage.width) {
    _imgW = backgroundImage.width;
    _vpW = Math.round((_vpH * _imgW) / _imgH);
  } else if (_imgH > backgroundImage.height) {
    _imgH = backgroundImage.height;
    _vpH = Math.round((_vpW * _imgH) / _imgW);
  }
  console.log(`_vpW = ${_vpW}`);
  console.log(`_vpW = ${_vpH}`);
}

/**
 * Resize all canvasses based on the angle of background image rotation, screen
 * size, and image width and height.
 *
 * TODO: This is leaning on global variables. It should not.
 *
 * @param angle
 * @param width
 * @param height
 * @returns
 */
function sizeVisibleCanvasses(width: number, height: number) {
  backgroundCanvas.width = width;
  backgroundCanvas.height = height;
  overlayCanvas.width = width;
  overlayCanvas.height = height;
}

function loadAllImages(background: string, overlay?: string) {
  const bgP = loadImage(background);
  const ovP = overlay ? loadImage(overlay) : Promise.resolve(null);
  return Promise.all([bgP, ovP]).then(([bgImg, ovImg]) => {
    // keep a copy of these to prevent having to recreate them from the image buffer
    backgroundImage = bgImg;
    if (ovImg) overlayImage = ovImg;
    else storeOverlay(false);
    return [bgImg, ovImg];
  });
}

function renderVisibleCanvasses() {
  renderImage(backgroundCtx, backgroundImage, _angle);
  renderImage(overlayCtx, overlayImage, _angle);
}

function renderAllCanvasses(
  background: ImageBitmap | null,
  overlay: ImageBitmap | null,
) {
  if (background) {
    sizeVisibleCanvasses(_canvasW, _canvasH);
    renderImage(backgroundCtx, background, _angle);
    if (overlay) {
      renderImage(overlayCtx, overlay, _angle);
      buff = overlayCtx.getImageData(
        0,
        0,
        overlayCtx.canvas.width,
        overlayCtx.canvas.height,
      );
      // sync full overlay to background size and draw un-scaled/un-rotated image
      fullOverlayCanvas.width = background.width;
      fullOverlayCanvas.height = background.height;
      fullCtx.drawImage(overlay, 0, 0);
      fullBuff = fullCtx.getImageData(0, 0, overlay.width, overlay.height);
    }
  }
}

function unrotateAndScaleRect(rect: Rect): Rect {
  const [rx1, ry1] = rotateBackToBackgroundOrientation(
    -_angle,
    rect.x,
    rect.y,
    _scaleW,
    _scaleH,
    _scaleOriginW,
    _scaleOriginH,
  );
  const [rx2, ry2] = rotateBackToBackgroundOrientation(
    -_angle,
    rect.x + rect.width,
    rect.y + rect.height,
    _scaleW,
    _scaleH,
    _scaleOriginW,
    _scaleOriginH,
  );
  // this isn't necessary but just keep values positive
  const x1 = Math.min(rx1, rx2);
  const x2 = Math.max(rx1, rx2);
  const y1 = Math.min(ry1, ry2);
  const y2 = Math.max(ry1, ry2);
  return {
    x: Math.round(scale * x1),
    y: Math.round(scale * y1),
    width: Math.round(scale * (x2 - x1)),
    height: Math.round(scale * (y2 - y1)),
  };
}

/**
 * Given to points on the overlay, un-rotate and scale to the full size overlay
 */
function unrotateBox(x1: number, y1: number, x2: number, y2: number) {
  // a few things - when zoomed, use _containerW, _containerH (scaleW/scaleH only makes
  // sense zoomed out)
  const [w, h, ow, oh] = [_canvasW, _canvasH, _unrotCanvasW, _unrotCanvasH];

  const op = rotateBackToBackgroundOrientation;
  // un-rotate the zoomed out viewport
  // this should be precalculated. And while we're there, we should
  // think of better names than vpW rvpW etc... there might be
  // better terminology too
  const [vpW, vpH] = rotatedWidthAndHeight(-_angle, _vpW, _vpH);
  const xOffset = _canvasW > vpW ? (_canvasW - vpW) / 2 : 0;
  const yOffset = _canvasH > vpH ? (_canvasH - vpH) / 2 : 0;

  // trim selection to viewport
  const [minY, maxY] = [yOffset, yOffset + vpH];
  const [minX, maxX] = [xOffset, xOffset + vpW];
  if (y1 < minY) y1 = minY;
  if (y2 < minY) y2 = minY;
  if (x1 < minX) x1 = minX;
  if (x2 < minX) x2 = minX;
  if (y1 > maxY) y1 = maxY;
  if (y2 > maxY) y2 = maxY;
  if (x1 > maxX) x1 = maxX;
  if (x2 > maxX) x2 = maxX;

  let [rx1, ry1] = op(-_angle, x1 - xOffset, y1 - yOffset, w, h, ow, oh).map(
    (n) => n * _zoom,
  );
  let [rx2, ry2] = op(-_angle, x2 - xOffset, y2 - yOffset, w, h, ow, oh).map(
    (n) => n * _zoom,
  );
  rx1 += _imgX;
  ry1 += _imgY;
  rx2 += _imgX;
  ry2 += _imgY;
  return [rx1, ry1, rx2 - rx1, ry2 - ry1];
}

function renderBox(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  style: string,
  full = true,
) {
  overlayCtx.save();
  overlayCtx.fillStyle = style;
  overlayCtx.fillRect(x1, y1, x2 - x1, y2 - y1);
  overlayCtx.restore();
  if (full) {
    const [x, y, w, h] = unrotateBox(x1, y1, x2, y2);
    fullCtx.save();
    fullCtx.fillStyle = style;
    fullCtx.fillRect(x, y, w, h);
    fullCtx.restore();
  }
}

function clearBox(x1: number, y1: number, x2: number, y2: number) {
  overlayCtx.clearRect(x1, y1, x2 - x1, y2 - y1);
  const [x, y, w, h] = unrotateBox(x1, y1, x2, y2);
  fullCtx.clearRect(x, y, w, h);
}

function clearCanvas() {
  overlayCtx.clearRect(0, 0, overlayCtx.canvas.width, overlayCtx.canvas.height);
  fullCtx.clearRect(0, 0, fullCtx.canvas.width, fullCtx.canvas.height);
}

function restoreOverlay() {
  overlayCtx.putImageData(buff, 0, 0);
  fullCtx.putImageData(fullBuff, 0, 0);
}

function fullRerender() {
  calculateCanvasses(
    _angle,
    backgroundImage.width,
    backgroundImage.height,
    _canvasW,
    _canvasH,
  );
  _max_zoom = Math.max(_fullRotW / _canvasW, _fullRotH / _canvasH);
  _first_zoom_step = firstZoomStep(_max_zoom, _zoom_step);
  // this might get weird for rotation -- maybe it belongs in calculateCanvasses...
  if (_zoom === undefined || _zoom > _max_zoom) {
    _zoom = _max_zoom;
  }
  calculateViewport(_angle, _zoom, _canvasW, _canvasH);
  renderAllCanvasses(backgroundImage, overlayImage);
}

/**
 * Store the updated overlay canvas buffers, update the un-rotated image, and
 * ship it to the main thread for upload unless told not to.
 *
 * @param post flag indicating if the image should be sent to the main thread
 *             for upload.
 */
function storeOverlay(post = true) {
  fullBuff = fullCtx.getImageData(
    0,
    0,
    fullCtx.canvas.width,
    fullCtx.canvas.height,
  );
  buff = overlayCtx.getImageData(
    0,
    0,
    overlayCtx.canvas.width,
    overlayCtx.canvas.height,
  );
  if (post)
    fullOverlayCanvas
      .convertToBlob()
      .then((blob: Blob) => postMessage({ cmd: "overlay", blob: blob }))
      .catch((err) =>
        console.error(`Unable to post blob: ${JSON.stringify(err)}`),
      );
  overlayImage = fullOverlayCanvas.transferToImageBitmap();
}

function animateSelection() {
  if (!recording) return;
  if (selecting) {
    restoreOverlay();
    renderBox(startX, startY, endX, endY, "rgba(255, 255, 255, 0.25)", false);
  } else if (panning) {
    // if (_zoom === 0) return;
    // calculate the (rotated) movement since the last frame and update for the next
    const [w, h] = rot(-_angle, endX - lastAnimX, endY - lastAnimY);
    [lastAnimX, lastAnimY] = [endX, endY];

    // move the panning offsets
    _imgX += Math.round((w * _max_zoom) / _zoom);
    _imgY += Math.round((h * _max_zoom) / _zoom);

    // ensure panning offsets are within image boundaries
    trimPanning();

    renderVisibleCanvasses();
  }
  requestAnimationFrame(animateSelection);
}

// eslint-disable-next-line no-restricted-globals
self.onmessage = (evt) => {
  switch (evt.data.cmd) {
    case "init": {
      _angle = evt.data.values.angle;

      if (evt.data.background) {
        backgroundCanvas = evt.data.background;
        _canvasW = backgroundCanvas.width;
        _canvasH = backgroundCanvas.height;
        backgroundCtx = backgroundCanvas.getContext("2d", {
          alpha: false,
        }) as OffscreenCanvasRenderingContext2D;
      }

      if (evt.data.overlay) {
        overlayCanvas = evt.data.overlay;
        overlayCtx = overlayCanvas.getContext("2d", {
          alpha: true,
        }) as OffscreenCanvasRenderingContext2D;
      }

      if (evt.data.fullOverlay) {
        fullOverlayCanvas = evt.data.fullOverlay;
        fullCtx = fullOverlayCanvas.getContext("2d", {
          alpha: true,
        }) as OffscreenCanvasRenderingContext2D;
      }

      loadAllImages(evt.data.values.background, evt.data.values.overlay)
        .then(([bgImg]) => {
          if (bgImg) {
            calculateViewport(_angle, _zoom, _canvasW, _canvasH);
            trimPanning();
            fullRerender();
          }
        })
        .then(() => {
          postMessage({
            cmd: "initialized",
            width: _scaleW,
            height: _scaleH,
            fullWidth: backgroundImage.width,
            fullHeight: backgroundImage.height,
          });
          buff = overlayCtx.getImageData(
            0,
            0,
            overlayCtx.canvas.width,
            overlayCtx.canvas.height,
          );
          fullBuff = fullCtx.getImageData(
            0,
            0,
            fullCtx.canvas.width,
            fullCtx.canvas.height,
          );
        })
        .catch((err) => {
          console.error(
            `Unable to load image ${evt.data.url}: ${JSON.stringify(err)}`,
          );
        });
      break;
    }
    case "resize": {
      _canvasW = evt.data.width;
      _canvasH = evt.data.height;
      if (backgroundImage) {
        calculateViewport(_angle, _zoom, _canvasW, _canvasH);
        trimPanning();
        fullRerender();
      }
      break;
    }
    case "rotate": {
      /**
       * Set the angle then render all canvasses. Keep in mind we are using
       * UN-ROTATED images as our starting point and rotating to the request
       * angle. If you start trying to use the actual canvas data, which might
       * already be rotated, you end up over-rotating and things get really bad.
       */
      _angle = evt.data.angle;
      fullRerender();
      break;
    }
    case "start_recording": {
      restoreOverlay();
      selecting = false;
      break;
    }
    case "record": {
      if (lastAnimX < 0) {
        // less than 0 indicates a new recording so initialize the last
        // animation x and y coordinates
        lastAnimX = evt.data.x1;
        lastAnimY = evt.data.y1;
      }
      startX = evt.data.x1;
      startY = evt.data.y1;
      endX = evt.data.x2;
      endY = evt.data.y2;
      if (!recording) {
        recording = true;
        selecting = evt.data.buttons === 1;
        panning = evt.data.buttons === 2;
        requestAnimationFrame(animateSelection);
      }
      break;
    }
    case "endrecording": {
      if (panning) {
        storeOverlay(false);
        postMessage({ cmd: "pan_complete" });
      }
      // when we're done recording we're done panning BUT not selecting
      // we still have a selection on screen. Selection ends at the start
      // of the next mouse recording
      recording = false;
      panning = false;
      // reset last animation coordinates
      lastAnimX = -1;
      lastAnimY = -1;
      break;
    }
    case "obscure": {
      restoreOverlay();
      const fill = `rgba(${red}, ${green}, ${blue}, ${opacity})`;
      renderBox(startX, startY, endX, endY, fill);
      storeOverlay();
      break;
    }
    case "reveal": {
      restoreOverlay();
      clearBox(startX, startY, endX, endY);
      storeOverlay();
      break;
    }
    case "clear": {
      clearCanvas();
      storeOverlay();
      break;
    }
    case "clearselection": {
      restoreOverlay();
      break;
    }
    case "opacity": {
      opacity = evt.data.opacity;
      break;
    }
    case "colour": {
      red = evt.data.red;
      green = evt.data.green;
      blue = evt.data.blue;
      break;
    }
    case "zoom": {
      /**
       * TODO this shouldn't be called zoom -- instead we should have a generic
       * "get the un-rotated rectangle projected on the full sized image" call.
       *
       * Then the caller and choose to zoom out or do something else...
       */
      // get the scaled down viewport
      const vp: Rect = evt.data.rect;
      // project onto un-rotated full size origin
      const fullVp = unrotateAndScaleRect(vp);
      // post back the full viewport
      postMessage({ cmd: "viewport", viewport: fullVp });
      // clear selection
      restoreOverlay();
      break;
    }
    case "zoom_in": {
      if (!_zoom) _zoom = _max_zoom;
      else if (_zoom === _max_zoom) _zoom = _first_zoom_step;
      else if (_zoom > _zoom_step) _zoom -= _zoom_step;
      calculateViewport(_angle, _zoom, _canvasW, _canvasH);
      renderAllCanvasses(backgroundImage, overlayImage);
      break;
    }
    case "zoom_out": {
      if (_zoom === _max_zoom) return;
      if (_zoom === _first_zoom_step) _zoom = _max_zoom;
      else _zoom += _zoom_step;
      calculateViewport(_angle, _zoom, _canvasW, _canvasH);
      trimPanning();
      renderAllCanvasses(backgroundImage, overlayImage);
      break;
    }
    default: {
      console.error(`Unexpected worker command: ${evt.data.cmd}`);
      break;
    }
  }
};

export {};
