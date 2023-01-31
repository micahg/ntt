import { createRef, useEffect } from 'react';
import { IMG_URI, loadImage, renderImage } from '../../utils/drawing';
import styles from './ContentEditor.module.css';

interface ContentEditorProps {}

const ContentEditor = () => {

  const contentCanvasRef = createRef<HTMLCanvasElement>();
  let mouseStartX: number = 0;
  let mouseStartY: number = 0;
  let mouseEndX: number = 0;
  let mouseEndY: number = 0;
  let down: boolean = false;
  let baseData: ImageData | null = null;

  useEffect(() => {
    const canvas = contentCanvasRef.current;
    if (!canvas) {
      // TODO SIGNAL ERROR
      console.error(`Unable to get canvas ref`);
      return;
    }

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      // TODO SIGNAL ERROR
      console.error(`Unable to get canvas context`);
      return;
    }

    loadImage(IMG_URI)
      .then(img => renderImage(img, canvas, ctx))
      .then(() => {
        baseData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        canvas.addEventListener('mousedown', mouseDown);
        canvas.addEventListener('mouseup', mouseUp);    
        canvas.addEventListener('mousemove', (event: MouseEvent) => mouseMove(event, ctx));
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
        <canvas id='fow' className={styles.ContentCanvas} ref={contentCanvasRef}>Sorry, your browser does not support canvas.</canvas>
      </div>
      <div className={styles.ControlsContainer}>
        <button>Pan and Zoom</button>
        <button>Obscure</button>
      </div>
    </div>
  );
}

export default ContentEditor;
