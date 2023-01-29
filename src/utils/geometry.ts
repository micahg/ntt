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
      let scale = canvasWidth / imageWidth;
      result.width = imageWidth * scale;
      result.height = imageHeight * scale;
  } else {
    let scale = canvasWidth / imageHeight;
    result.width = imageHeight * scale;
    result.height = imageWidth * scale;
  }
    // canvas 20 image 10 => 2
    if (canvasWidth >= canvasHeight) {
        if (imageWidth >= imageHeight) {
            let scale = canvasWidth / imageWidth;
            result.width = imageWidth * scale;
            result.height = imageHeight * scale;
        } else {
            let scale = canvasWidth / imageHeight;
            result.rotate = true;
            result.width = imageHeight * scale;
            result.height = imageWidth * scale;
        }
    } else {
        // canvasHeight > canvasWidth
        if (imageHeight > imageWidth) {
            let scale = canvasWidth / imageWidth;
            result.width = imageWidth * scale;
            result.height = imageHeight * scale;
        } else {
            let scale = canvasWidth / imageHeight;
            result.width = imageHeight * scale;
            result.height = imageWidth * scale;
        }
    }
    
    result.rotate = rotate;
    return result;
}