import { createRef, useEffect } from 'react';
import { IMG_URI, loadImage, renderImage, setupOverlayCanvas } from '../../utils/drawing';
import styles from './ContentEditor.module.css';

interface ContentEditorProps {}

const ContentEditor = () => {

  const contentCanvasRef = createRef<HTMLCanvasElement>();
  const overlayCanvasRef = createRef<HTMLCanvasElement>();
  let mouseStartX: number = 0;
  let mouseStartY: number = 0;
  let mouseEndX: number = 0;
  let mouseEndY: number = 0;
  let down: boolean = false;
  let baseData: ImageData | null = null;

  useEffect(() => {
    const contentCnvs = contentCanvasRef.current;
    if (!contentCnvs) {
      // TODO SIGNAL ERROR
      console.error(`Unable to get content canvas ref`);
      return;
    }

    const overlayCnvs = overlayCanvasRef.current;
    if (!overlayCnvs) {
      // TODO SIGNAL ERROR
      console.error(`Unable to get overlay canvas ref`)
      return;
    }

    const contentCtx = contentCnvs.getContext('2d', { alpha: false });
    if (!contentCtx) {
      // TODO SIGNAL ERROR
      console.error(`Unable to get content canvas context`);
      return;
    }

    const overlayCtx = overlayCnvs.getContext('2d', {alpha: true})
    if (!overlayCtx) {
      // TODO SIGNAL ERROR
      console.error('Unable to get overlay canvas context')
      return;
    }

    loadImage(IMG_URI)
      .then(img => renderImage(img, contentCnvs, contentCtx))
      .then(() => setupOverlayCanvas(contentCnvs, overlayCnvs, overlayCtx))
      .then(() => {
        baseData = overlayCtx.getImageData(0, 0, contentCnvs.width, contentCnvs.height);
        overlayCnvs.addEventListener('mousedown', mouseDown);
        overlayCnvs.addEventListener('mouseup', mouseUp);    
        overlayCnvs.addEventListener('mousemove', (event: MouseEvent) => mouseMove(event, overlayCtx));
      })
      .catch(err => {
        // TODO SIGNAL ERROR
        console.log(`Unable to load image: ${JSON.stringify(err)}`);
      });
  });

  const mouseDown = (event: MouseEvent) => {
    mouseStartX = event.x;
    mouseStartY = event.y;
    down = true;
  }

  const mouseUp = (event: MouseEvent) => {
    down = false;
    mouseEndX = event.x;
    mouseEndY = event.y;
  }
  
  const mouseMove = (event: MouseEvent, ctx: CanvasRenderingContext2D) => {
    if (!down) return;
    if (event.x == mouseEndX && event.y == mouseEndY) return;
    mouseEndX = event.x;
    mouseEndY = event.y;
    if (!baseData) return;
    ctx.putImageData(baseData, 0, 0);
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.fillRect(mouseStartX,mouseStartY,mouseEndX-mouseStartX,mouseEndY-mouseStartY);
  }

  return (
    <div className={styles.ContentEditor} data-testid="ContentEditor">
      <div className={styles.ContentContainer} data-testid="RemoteDisplayComponent">
        <canvas className={styles.ContentCanvas} ref={contentCanvasRef}>Sorry, your browser does not support canvas.</canvas>
        <canvas className={styles.OverlayCanvas} ref={overlayCanvasRef}/>
      </div>
      <div className={styles.ControlsContainer}>
        <button>Pan and Zoom</button>
        <button>Obscure</button>
      </div>
    </div>
  );
}

export default ContentEditor;
