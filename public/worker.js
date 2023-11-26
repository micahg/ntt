/**
 * Worker for offscreen drawing in the content editor.
 */
let canvas;
let ctx;
let fullCanvas;
let fullCtx;
let recording = false;
let buff;
let fullBuff;

let startX, startY, endX, endY;
let scale;

let opacity = '1';
let red = '255';
let green = '0';
let blue = '0';

function renderBox(x1, y1, x2, y2, style, full = true) {
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

function clearBox(x1, y1, x2, y2) {
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
  fullCtx.canvas.convertToBlob()
    .then(blob => postMessage({cmd: 'overlay', blob: blob}))
    .catch(err => console.error(`Unable to post blob: ${JSON.stringify(err)}`));
}

// eslint-disable-next-line no-restricted-globals
self.onmessage = evt => {
  switch(evt.data.cmd) {
    case 'init': {
      console.log(evt.data);
      if (evt.data.canvas) {
        canvas = evt.data.canvas;
        ctx = canvas.getContext('2d', { alpha: true });
      }
      canvas.width = evt.data.values.width;
      canvas.height = evt.data.values.height;

      scale = evt.data.values.fullWidth/evt.data.values.width;

      if (evt.data.fullCanvas) {
        fullCanvas = evt.data.fullCanvas;
        fullCtx = fullCanvas.getContext('2d', { alpha: true });
      }
      fullCanvas.width = evt.data.values.fullWidth;
      fullCanvas.height = evt.data.values.fullHeight;

      clearCanvas();
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