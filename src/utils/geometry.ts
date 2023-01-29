import { resourceLimits } from "worker_threads";

interface ImageBound {
  left: number;
  top: number;
  width: number;
  height: number;
  rotate: boolean;
}

export function calculateBounds(canvasWidth: number, canvasHeight: number, imageWidth: number, imageHeight: number) {
  let result:ImageBound = {left: 0, top: 0, height: 0, width: 0, rotate: false};
  let wideImage: boolean = imageWidth >= imageHeight;
  let wideCanvas: boolean = canvasWidth >= canvasHeight;
  let rotate = (wideCanvas !== wideImage)

  if ((canvasWidth >= canvasHeight && imageWidth >= imageHeight) ||
      (canvasHeight > canvasWidth && imageHeight >= imageWidth)) {
    let scale = Math.min(canvasWidth / imageWidth, canvasHeight / imageHeight);
    result.width = imageWidth * scale;
    result.height = imageHeight * scale;
    result.top = (canvasHeight - result.height)/2;
    result.left = (canvasWidth - result.width)/2;
  } else {
    let scale = canvasWidth / imageHeight;
    result.width = imageHeight * scale;
    result.height = imageWidth * scale;
    result.rotate = true;
  }

    
    result.rotate = rotate;
    return result;
}