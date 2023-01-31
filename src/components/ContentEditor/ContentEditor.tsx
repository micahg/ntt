import { createRef, useEffect } from 'react';
import { IMG_URI, loadImage, renderImage } from '../../utils/drawing';
import styles from './ContentEditor.module.css';

interface ContentEditorProps {}

const ContentEditor = () => {

  const contentCanvasRef = createRef<HTMLCanvasElement>();

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
      .catch(err => {
        // TODO SIGNAL ERROR
        console.log(`Unable to load image: ${JSON.stringify(err)}`);
      });
  });
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
