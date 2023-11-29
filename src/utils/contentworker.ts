import { containingRect, getMaxContainerSize, getScaledContainerSize } from "./geometry";

/**
 * Worker for offscreen drawing in the content editor.
 */
let canvas: OffscreenCanvas;
let ctx: OffscreenCanvasRenderingContext2D;
let fullCanvas: OffscreenCanvas;
let fullCtx: OffscreenCanvasRenderingContext2D;
let recording = false;
let buff: ImageData;
let fullBuff: ImageData;
let angle: number;
let fullW: number;
let fullH: number;
let screenW: number;
let screenH: number;

let startX: number, startY: number, endX: number, endY: number;
let scale: number;

let opacity = '1';
let red = '255';
let green = '0';
let blue = '0';

function sizeCanvas(fullWidth: number, fullHeight: number, canvasWidth: number, canvasHeight: number) {
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  fullCanvas.width = fullWidth;
  fullCanvas.height = fullHeight;
  scale = fullWidth/canvasWidth;
}

function renderBox(x1: number, y1: number, x2: number, y2: number, style: string, full = true) {
  const [w,h] = [x2-x1, y2-y1]
  ctx.save();
  ctx.fillStyle = style;
  ctx.fillRect(x1, y1, w, h);
  ctx.restore();
  if (full) {
    console.log('rendering fullctx');
    fullCtx.save();
    fullCtx.fillStyle = style;
    fullCtx.fillRect(scale*x1, scale*y1, scale*w, scale*h);
    fullCtx.restore();  
  }
}

function clearBox(x1: number, y1: number, x2: number, y2: number) {
  const [w,h] = [x2 - x1, y2 - y1];
  ctx.clearRect(x1,y1,w,h);
  fullCtx.clearRect(scale*x1,scale*y1,scale*w,scale*h);
}

function clearCanvas() {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  buff = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  fullCtx.clearRect(0, 0, fullCtx.canvas.width, fullCtx.canvas.height);
  fullBuff = fullCtx.getImageData(0, 0, fullCtx.canvas.width, fullCtx.canvas.height);
}

function animateSelection() {
  if (!recording) return;
  ctx.putImageData(buff, 0, 0);
  fullCtx.putImageData(fullBuff, 0, 0);
  renderBox(startX, startY, endX, endY, 'rgba(255, 255, 255, 0.25)', false);
  requestAnimationFrame(animateSelection);
}

function sendBlob() {
  fullCanvas.convertToBlob()
    .then((blob:Blob) => postMessage({cmd: 'overlay', blob: blob}))
    .catch((err:any) => console.error(`Unable to post blob: ${JSON.stringify(err)}`));
}

// eslint-disable-next-line no-restricted-globals
self.onmessage = evt => {
  switch(evt.data.cmd) {
    case 'init': {
      console.log(evt.data);
      fullW = evt.data.values.fullWidth;
      fullH = evt.data.values.fullHeight;
      screenW = evt.data.values.screenWidth;
      screenH = evt.data.values.screenHeight;
      const [maxW, maxH] = getMaxContainerSize(screenW, screenH);
      const [w, h] = getScaledContainerSize(maxW, maxH, fullW, fullH)
      

      if (evt.data.canvas) {
        canvas = evt.data.canvas;
        ctx = canvas.getContext('2d', { alpha: true }) as OffscreenCanvasRenderingContext2D;
      }

      if (evt.data.fullCanvas) {
        fullCanvas = evt.data.fullCanvas;
        fullCtx = fullCanvas.getContext('2d', { alpha: true }) as OffscreenCanvasRenderingContext2D;
      }

      sizeCanvas(fullW, fullH, w, h);

      clearCanvas();
      break;
    }
    case 'rotate': {
      angle = evt.data.angle;
      console.log(`Rotating to ${angle}`);
      // consider that one day you might rotate 30 degrees, we need to figure out how much bigger
      // the canvas would be to hold the rotated image... so my geometrically challenged logic is
      // as follows

      // just establish the biggest box we can render to considering our screen and ui components
      const [contW, contH] = getMaxContainerSize(screenW, screenH);

      // rotate the full sized canvas
      const [fullRotW, fullRotH] = containingRect(angle, fullW, fullH);

      // scale the rotated full size image down be contained within our container bounds
      const [scaleContW, scaleContH] = getScaledContainerSize(contW, contH, fullRotW, fullRotH);
      
      // rotate backwards to get the original height/width scaled down (we need it to drawImage)
      const [scaleW, scaleH] = containingRect(-angle, scaleContW, scaleContH);


      console.log(`Full rotated canvas ${fullW}x${fullH}`);
      console.log(`Max container size ${contW}x${contH}`);
      console.log(`Scaled container ${scaleContW}x${scaleContH}`);
      console.log(`Unrotated image size ${scaleW}x${scaleH}`);

      sizeCanvas(fullRotW, fullRotH, scaleContW, scaleContH);

      createImageBitmap(fullBuff).then(bmp => {
        ctx.save();
        ctx.translate(scaleContW/2, scaleContH/2);
        ctx.rotate(angle * Math.PI/180);
        ctx.drawImage(bmp, -scaleW/2, -scaleH/2, scaleW, scaleH);
        ctx.restore();
      });
      
      break;
    }
    case 'record': {
      startX = evt.data.x1;
      startY = evt.data.y1;
      endX = evt.data.x2;
      endY = evt.data.y2;
      if (!recording) {      
        recording = true;
        ctx.putImageData(buff, 0, 0);
        fullCtx.putImageData(fullBuff, 0, 0);
        requestAnimationFrame(animateSelection);
      }
      break;
    }
    case 'endrecording': {
      recording = false;
      break;
    }
    case 'obscure': {
      ctx.putImageData(buff, 0, 0);
      fullCtx.putImageData(fullBuff, 0, 0);
      const fill = `rgba(${red}, ${green}, ${blue}, ${opacity})`;
      renderBox(startX, startY, endX, endY, fill);
      fullBuff = fullCtx.getImageData(0, 0, fullCtx.canvas.width, fullCtx.canvas.height);
      buff = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
      sendBlob();
      break;
    }
    case 'reveal': {
      ctx.putImageData(buff, 0, 0);
      fullCtx.putImageData(fullBuff, 0, 0);
      clearBox(startX, startY, endX, endY);
      fullBuff = fullCtx.getImageData(0, 0, fullCtx.canvas.width, fullCtx.canvas.height);
      buff = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
      sendBlob();
      break;
    }
    case 'clear': {
      ctx.putImageData(buff, 0, 0);
      fullCtx.putImageData(fullBuff, 0, 0);
      clearCanvas();
      sendBlob();
      break;
    }
    case 'clearselection': {
      ctx.putImageData(buff, 0, 0);
      fullCtx.putImageData(fullBuff, 0, 0);
      break;
    }
    case 'opacity': {
      opacity = evt.data.opacity;
      break;
    }
    case 'colour': {
      red = evt.data.red;
      green = evt.data.green;
      blue = evt.data.blue;
      break;
    }
    case 'load': {
      console.log(evt.data);
      fetch(evt.data.url)
        .then(resp => resp.blob())
        .then(blob => createImageBitmap(blob))
        .then(image => {
          fullCtx.drawImage(image, 0, 0)
          ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height);
          fullBuff = fullCtx.getImageData(0, 0, fullCtx.canvas.width, fullCtx.canvas.height);
          buff = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        })
        .catch(err => console.error(`Unable to load image ${evt.data.url}: ${JSON.stringify(err)}`));
      break;
    }
    default: {
      console.error(`Unexpected worker command: ${evt.data.cmd}`);
      break;
    }
  }
}

export {};