import {
  Rect,
  // calculateScaleSteps,
  getMaxContainerSize,
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
let _pan_x = 0;
let _pan_y = 0;
let _zoom = 0;
let _min_zoom: number;
let _containerW: number;
let _containerH: number;
let _scaleW: number;
let _scaleH: number;
let _scaleOriginW: number;
let _scaleOriginH: number;
let _fullRotW: number;
let _unrotCanvasW: number;
let _unrotCanvasH: number;
let _fullRotH: number;
let _vpW: number;
let _vpH: number;
let _rvpW: number;
let _rvpH: number;

let startX: number, startY: number, endX: number, endY: number;
let lastAnimX = -1;
let lastAnimY = -1;
let scale: number;

let opacity = "1";
let red = "255";
let green = "0";
let blue = "0";

function renderImage(
  ctx: OffscreenCanvasRenderingContext2D,
  img: ImageBitmap,
  angle: number,
) {
  /**
   * math!
   *
   * Zoomed out we just base the canvas size off the image size with rotation applied. Hence,
   * we render img.width and img.height when full zoomed out - the canvas already compensates.
   *
   * Zoomed in is a little more complicated.  Our zoom factor is based on the canvas size. 1
   * means we're fully zoomed in (1:1 pixel scale) and less zooms out to a max of either the
   * width or height of the image (whichever fits first)
   */
  // TODO calculate this statically
  // const [cw, ch] = [ctx.canvas.width, ctx.canvas.height];
  // const [rcw, rch] = rotatedWidthAndHeight(-angle, cw, ch);
  // const [sw, sh] = zoom ? [zoom * rcw, zoom * rch] : [img.width, img.height];
  // if (_pan_x + sw > _fullRotW) _pan_x = _fullRotW - sw;
  // if (_pan_y + sh > _fullRotH) _pan_y = _fullRotH - sh;
  // if (_pan_x + _vpW > _fullRotW) _pan_x = _fullRotW - _vpW;
  // if (_pan_y + _vpH > _fullRotH) _pan_y = _fullRotH - _vpH;

  // MICAH THIS WORKED
  // if (_pan_x + _vpW > img.width) _pan_x = img.width - _vpW;
  // if (_pan_y + _vpH > img.height) _pan_y = img.height - _vpH;

  // if (debug) {
  //   console.log(`*****`);
  //   console.log(`translate ${ctx.canvas.width / 2}, ${ctx.canvas.height / 2}`);
  //   console.log(
  //     `draw ${_pan_x}, ${_pan_y}, ${_vpW}, ${_vpH}, ${-_rvpW / 2}, ${
  //       -_rvpH / 2
  //     }, ${_rvpW}, ${_rvpH}`,
  //   );
  //   console.log(`*****`);
  // }

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
  ctx.rotate((angle * Math.PI) / 180);
  // ctx.drawImage(img, 0, 0, sw, sh, -rcw / 2, -rch / 2, rcw, rch);
  // ctx.drawImage(img, _pan_x, _pan_y, sw, sh, -rcw / 2, -rch / 2, rcw, rch);
  ctx.drawImage(
    img,
    _pan_x,
    _pan_y,
    // MICAH, you linear algebraically challenged donkey - we rotate the context
    // so REMEMBER: the actual source viewport SHOULD NOT BE ROTATED
    _vpW, // 1394
    _vpH, // 550
    -_rvpW / 2, // - 1394 /2
    -_rvpH / 2, // - 550 / 2
    _rvpW, // 1394
    _rvpH, // 550
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
  scale = width / scaleW;

  _scaleOriginW = scaleW;
  _scaleOriginH = scaleH;
  _scaleW = scaleContW;
  _scaleH = scaleContH;

  [_rvpW, _rvpH] = [_scaleOriginW, _scaleOriginH];
  [_vpW, _vpH] = [width, height];
  return;
}

function calculateViewport(
  angle: number,
  zoom: number,
  containerWidth: number,
  containerHeight: number,
) {
  const [cw, ch] = [containerWidth, containerHeight];
  [_rvpW, _rvpH] = rotatedWidthAndHeight(-angle, cw, ch);
  [_vpW, _vpH] = [zoom * _rvpW, zoom * _rvpH];
}

// function calculateViewport(zoom: number, width: number, height: number) {
//   const [vw, vh] = zoom ? [zoom * _scaleOriginW, zoom * _scaleOriginH] : [img.width, img.height];
// }

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
function sizeVisibleCanvasses(width: number, height: number, zoom: number) {
  const [scaleContW, scaleContH] = zoom
    ? [_containerW, _containerH]
    : getScaledContainerSize(_containerW, _containerH, _fullRotW, _fullRotH);
  // set the canvases
  backgroundCanvas.width = scaleContW;
  backgroundCanvas.height = scaleContH;
  overlayCanvas.width = scaleContW;
  overlayCanvas.height = scaleContH;
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
    sizeVisibleCanvasses(_fullRotW, _fullRotH, _zoom);
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
  const [w, h, ow, oh] = _zoom
    ? [_containerW, _containerH, _unrotCanvasW, _unrotCanvasH]
    : [_scaleW, _scaleH, _scaleOriginW, _scaleOriginH];
  const op = rotateBackToBackgroundOrientation;
  let [rx1, ry1] = op(-_angle, x1, y1, w, h, ow, oh);
  let [rx2, ry2] = op(-_angle, x2, y2, w, h, ow, oh);
  console.log(_zoom);
  rx1 += _pan_x;
  ry1 += _pan_y;
  rx2 += _pan_x;
  ry2 += _pan_y;
  // const [rw, rh] = [rx2 - rx1, ry2 - ry1];
  const [rw, rh] = [rx2 - rx1, ry2 - ry1];
  const co = _zoom ? _zoom : scale;
  return [co * rx1, co * ry1, co * rw, co * rh];
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
    _containerW,
    _containerH,
  );
  // const steps = calculateScaleSteps(
  //   _containerW,
  //   _containerH,
  //   _fullRotW,
  //   _fullRotH,
  // );
  _min_zoom = _fullRotW / _containerW; //1 / steps[0];
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
    if (_zoom === 0) return;
    // calculate the (rotated) movement since the last frame and update for the next
    const [w, h] = rot(-_angle, endX - lastAnimX, endY - lastAnimY);
    [lastAnimX, lastAnimY] = [endX, endY];

    // move the panning offsets
    _pan_x += w;
    _pan_y += h;

    // ensure panning offsets are within image boundaries
    if (_pan_x <= 0) _pan_x = 0;
    if (_pan_x + _vpW > backgroundImage.width)
      _pan_x = backgroundImage.width - _vpW;
    if (_pan_y <= 0) _pan_y = 0;
    if (_pan_y + _vpH > backgroundImage.height)
      _pan_y = backgroundImage.height - _vpH;

    renderVisibleCanvasses();
  }
  requestAnimationFrame(animateSelection);
}

// eslint-disable-next-line no-restricted-globals
self.onmessage = (evt) => {
  switch (evt.data.cmd) {
    case "init": {
      console.log(evt.data);
      [_containerW, _containerH] = getMaxContainerSize(
        evt.data.values.screenWidth,
        evt.data.values.screenHeight,
      );
      // TODO get the angle from the viewport on load
      _angle = evt.data.values.angle;

      if (evt.data.background) {
        backgroundCanvas = evt.data.background;
        backgroundCtx = backgroundCanvas.getContext("2d", {
          alpha: true,
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
      /*

      const [scaleContW, scaleContH] = zoom
        ? [_containerW, _containerH]
        : getScaledContainerSize(_containerW, _containerH, _fullRotW, _fullRotH);
      // set the canvases
      backgroundCanvas.width = scaleContW;
      backgroundCanvas.height = scaleContH;
      overlayCanvas.width = scaleContW;
      overlayCanvas.height = scaleContH;

      _scaleW = scaleContW;
      _scaleH = scaleContH;

      const [cw, ch] = [ctx.canvas.width, ctx.canvas.height]; //... [_containerW, _containerH]
      const [rcw, rch] = rotatedWidthAndHeight(-angle, cw, ch); //... [_scaleOriginW, _scaleOriginH]
      const [sw, sh] = zoom ? [zoom * rcw, zoom * rch] : [img.width, img.height];
      ctx.drawImage(img, _pan_x, _pan_y, sw, sh, -rcw / 2, -rch / 2, rcw, rch);

      ...

      MICAH WHEN YOU COME BACK we're not storing the rotated canvas dimensions (container dimensions)
      so the viewport calculation that should happen on zoom should start there using the formulas above

      */
      if (!_zoom) {
        _zoom = _min_zoom;
        calculateViewport(_angle, _zoom, _containerW, _containerH);
        renderAllCanvasses(backgroundImage, overlayImage);
      } else if (_zoom === _min_zoom) {
        _zoom = 1;
        calculateViewport(_angle, _zoom, _containerW, _containerH);
        renderAllCanvasses(backgroundImage, overlayImage);
      } else {
        console.log("CANT ZOOM FURTHER YET");
      }
      break;
    }
    case "zoom_out": {
      if (_zoom) {
        _zoom = 0;
        [_pan_x, _pan_y] = [0, 0];
        [_rvpW, _rvpH] = [_scaleOriginW, _scaleOriginH];
        [_vpW, _vpH] = [backgroundImage.width, backgroundImage.height];
        renderAllCanvasses(backgroundImage, overlayImage);
      } else console.log("CANT ZOOM OUT ANY FURTHER");
      break;
    }
    default: {
      console.error(`Unexpected worker command: ${evt.data.cmd}`);
      break;
    }
  }
};

export {};
