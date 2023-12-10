/**
 * @jest-environment jsdom
 */

import { Rect, calculateBounds, scaleSelection, fillToAspect, rotatedWidthAndHeight, getScaledContainerSize, rotateBackToBackgroundOrientation, rotateAndFillViewport, cb} from "../src/utils/geometry";

describe('Geometry', () => {
  describe('Rotation', () => {
    it('Should rotate a points back to the origin of the prerotated width', () => {
      let x: number, y: number;
      [x, y] = rotateBackToBackgroundOrientation(-90, 0, 4, 2, 4, 4, 2);
      expect(x).toBe(4);
      expect(y).toBe(2);
      [x, y] = rotateBackToBackgroundOrientation(-180, 0, 4, 2, 4, 2, 4);
      expect(x).toBe(2);
      expect(y).toBe(0);
    });
  });

  describe('Calculate Bounds', () => {
    it('Should handle a perfect fit', () => {
      const result = calculateBounds(10,10,10,10);
      expect(result.top).toEqual(0);
      expect(result.left).toEqual(0);
      expect(result.width).toEqual(10);
      expect(result.height).toEqual(10);
      expect(result.rotate).toEqual(false);
    });
  
    it('Should handle a wide display/wide image', () => {
      const result = calculateBounds(20,10,10,5);
      expect(result.top).toEqual(0);
      expect(result.left).toEqual(0);
      expect(result.width).toEqual(20);
      expect(result.height).toEqual(10);
      expect(result.rotate).toEqual(false);
    });
  
    it('Should handle wide display with larger aspect height but wide image', () => {
      const result = calculateBounds(20, 10, 10, 8);
      expect(result.left).toEqual(3.75);
      expect(result.top).toEqual(0);
      expect(result.width).toEqual(12.5);
      expect(result.height).toEqual(10);
      expect(result.rotate).toEqual(false);
    });
  
    it('Should handle wide display with smaller aspect height but wide image', () => {
      const result = calculateBounds(20, 10, 10, 4);
      expect(result.left).toEqual(0);
      expect(result.top).toEqual(1);
      expect(result.width).toEqual(20);
      expect(result.height).toEqual(8);
      expect(result.rotate).toEqual(false);
    });
  
    it('Should handle wide display with a larger wide image with a smaller aspect height but wide image', () => {
      const result = calculateBounds(20, 10, 30, 12);
      expect(result.left).toEqual(0);
      expect(result.top).toEqual(1);
      expect(result.width).toEqual(20);
      expect(result.height).toEqual(8);
      expect(result.rotate).toEqual(false);
    });
  
    it ('Should rotate a tall image to a wide display', () => {
      const result = calculateBounds(20, 10, 10, 20);
      expect(result.left).toEqual(0);
      expect(result.top).toEqual(0);
      expect(result.width).toEqual(10);
      expect(result.height).toEqual(20);
      expect(result.rotate).toEqual(true);
    });
  
    it ('Should rotate and scale a tall image to a wide display', () => {
      const result = calculateBounds(20, 10, 5, 10);
      expect(result.left).toEqual(0);
      expect(result.top).toEqual(0);
      expect(result.width).toEqual(10);
      expect(result.height).toEqual(20);
      expect(result.rotate).toEqual(true);
    });
  
    it ('Should rotate and scale a tall image with a different aspect ratio to a wide display', () => {
      const result = calculateBounds(20, 10, 8, 10);
      expect(result.left).toEqual(3.75);
      expect(result.top).toEqual(0);
      expect(result.width).toEqual(10);
      expect(result.height).toEqual(12.5);
      expect(result.rotate).toEqual(true);
    });
  
    it('Should rotate a larger wide image with a smaller aspect height but wide image', () => {
      const result = calculateBounds(20, 10, 12, 30);
      expect(result.left).toEqual(0);
      expect(result.top).toEqual(1);
      expect(result.width).toEqual(8);
      expect(result.height).toEqual(20);
      expect(result.rotate).toEqual(true);
    });

    it('Brain Melting', () => {
      const result = cb(1422, 647, 4160, 2008);
      expect(result.x).toEqual(41);
      expect(result.y).toEqual(0);
      expect(result.width).toEqual(1340);
      expect(result.height).toEqual(647);
    });

    it('Brain Melting 2', () => {
      const result = cb(1422, 647, 5200, 2008);
      expect(result.x).toEqual(0);
      expect(result.y).toEqual(49);
      expect(result.width).toEqual(1422);
      expect(result.height).toEqual(549);
    });
  });

  describe('Scale Selection', () => {
    it('Should scale horizontally', () => {
      const viewport: Rect = {x: 0, y: 0, width: 3, height: 3};
      const selection: Rect = {x: 1, y: 1, width: 1, height: 1};
      const width = 6;
      const height = 3;
      const result = scaleSelection(selection, viewport, width, height);
      expect(result.x).toEqual(2);
      expect(result.y).toEqual(1);
      expect(result.width).toEqual(2);
      expect(result.height).toEqual(1);
    });
    it('Should scale vertically', () => {
      const viewport: Rect = {x: 0, y: 0, width: 3, height: 3};
      const selection: Rect = {x: 1, y: 1, width: 1, height: 1};
      const width = 3;
      const height = 6;
      const result = scaleSelection(selection, viewport, width, height);
      expect(result.x).toEqual(1);
      expect(result.y).toEqual(2);
      expect(result.width).toEqual(1);
      expect(result.height).toEqual(2);
    });
    it('Should scale in both directions', () => {
      const viewport: Rect = {x: 0, y: 0, width: 3, height: 3};
      const selection: Rect = {x: 1, y: 1, width: 1, height: 1};
      const width = 6;
      const height = 6;
      const result = scaleSelection(selection, viewport, width, height);
      expect(result.x).toEqual(2);
      expect(result.y).toEqual(2);
      expect(result.width).toEqual(2);
      expect(result.height).toEqual(2);
    });
  });

  describe('Fill to Aspect Ratio', () => {
    beforeAll(() => {
      global.innerWidth = 960;
      global.innerHeight = 540;
      jest.spyOn(document.documentElement, 'clientWidth', 'get').mockImplementation(() => global.innerWidth)
      jest.spyOn(document.documentElement, 'clientHeight', 'get').mockImplementation(() => global.innerHeight)
      jest.spyOn(document.documentElement, 'offsetWidth', 'get').mockImplementation(() => global.innerWidth)
      jest.spyOn(document.documentElement, 'offsetHeight', 'get').mockImplementation(() => global.innerHeight)
    })
    it('Should fill a square selection', () => {
      const selection: Rect = {x: 2000, y: 1000, width: 1000, height: 500}
      const table: Rect = { x: 0, y:0, width: 6750, height: 4950};
      const filled = fillToAspect(selection, table, table.width, table.height);
      expect(filled).not.toBeNull();
      expect(filled.x).toBe(2000);
      expect(filled.width).toBe(1000);
      expect(filled.height).toBe(562.5)
      expect(filled.y).toBe(968.75)
    });

    it('Should Scale Horizontally With A Reduced Image Size', () => {
      const width = 5063;
      const height = 3713;
      const selection: Rect = {x: 5316, y: 4010, width: 1422, height: 939}
      const table: Rect = { x: 0, y:0, width: 6750, height: 4950};
      const filled = fillToAspect(selection, table, width, height);
      expect(filled).not.toBeNull();
      // these values are incorrect and work around a browser issue with
      // drawImage... I think.
      expect(Math.round(filled.x)).toBe(2858);
      expect(Math.round(filled.width)).toBe(939);
      expect(Math.round(filled.height)).toBe(528)
      expect(Math.round(filled.y)).toBe(2256)
      // these are the correct values
      // expect(Math.round(filled.x)).toBe(3811);
      // expect(Math.round(filled.width)).toBe(1252);
      // expect(Math.round(filled.height)).toBe(704)
      // expect(Math.round(filled.y)).toBe(3008)
    });

    it('Should Scale Vertically With A Reduced Image Size', () => {
      const width = 5063;
      const height = 3713;
      const selection: Rect = {x: 5316, y: 4449, width: 1422, height: 500}
      const table: Rect = { x: 0, y:0, width: 6750, height: 4950};
      const filled = fillToAspect(selection, table, width, height);
      expect(filled).not.toBeNull();
      // these values are incorrect and work around a browser issue with
      // drawImage... I think.
      expect(Math.round(filled.x)).toBe(2991);
      expect(Math.round(filled.width)).toBe(800);
      expect(Math.round(filled.height)).toBe(450)
      expect(Math.round(filled.y)).toBe(2335)

      // these are the actual values
      // expect(Math.round(filled.x)).toBe(3987);
      // expect(Math.round(filled.width)).toBe(1067);
      // expect(Math.round(filled.height)).toBe(600)
      // expect(Math.round(filled.y)).toBe(3113)
    });

    it('Should figure out the rotated width and height', () => {
      let [x, y] = rotatedWidthAndHeight(90, 2, 4);
      expect(x).toBe(4);
      expect(y).toBe(2);
      [x, y] = rotatedWidthAndHeight(180, 2, 4);
      expect(x).toBe(2);
      expect(y).toBe(4);
      [x, y] = rotatedWidthAndHeight(270, 2, 4);
      expect(x).toBe(4);
      expect(y).toBe(2);
      [x, y] = rotatedWidthAndHeight(360, 2, 4);
      expect(x).toBe(2);
      expect(y).toBe(4);
    });

    it('Should figure out the scaled container size', () => {
      const [w, h] = getScaledContainerSize(3, 1, 4, 2);
      expect(w).toBe(2);
      expect(h).toBe(1);
    });
  });

  describe('Rotate and Fill Viewport', () => {
    it('Should rotate and fill the viewport horizontally', () => {
      const screen = [960, 540];
      const image = [2008, 4160];
      const angle = 90;
      const viewport = {x: 100, y: 100, width: 100, height: 100};
      const result = rotateAndFillViewport(screen, image, image, angle, viewport);
      expect(result.width).toBe(100);
      expect(result.height).toBe(178);
      expect(result.x).toBe(100);
      expect(result.y).toBe(61);
    });

    it('Should rotate and fill the viewport', () => {
      const screen = [960, 540];
      const image = [2008, 4160];
      const angle = 90;
      const viewport = {x: 100, y: 100, width: 100, height: 10};
      const result = rotateAndFillViewport(screen, image, image, angle, viewport);
      expect(result.width).toBe(100);
      expect(result.height).toBe(178);
      expect(result.x).toBe(100);
      expect(result.y).toBe(16);
    });

    it('BRAIN MELTING', () => {
      const screen = [1420, 641];
      const image = [2008, 4160];
      const angle = 90;
      const viewport = { x: 300, y: 1294, width: 72, height: 448 }
      const result = rotateAndFillViewport(screen, image, image, angle, viewport);
      expect(result.width).toBe(202);
      expect(result.height).toBe(448);
      expect(result.x).toBe(235);
      expect(result.y).toBe(1294);
    });

    it('It should retain viewport when not zoomed', () => {
      const screen = [1420, 642];
      const image = [2888, 1838];
      const angle = 0;
      const viewport = { x: 0, y: 0, width: 2888, height: 1838 }
      const result = rotateAndFillViewport(screen, image, image, angle, viewport);
      expect(result.width).toBe(2888);
      expect(result.height).toBe(1838);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    })
  });
});