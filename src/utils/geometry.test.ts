import { calculateBounds } from "./geometry";

describe('Calculate Bounds', () => {
  it('Should return 0', () => {
    let result = calculateBounds(10,10,10,10);
    expect(result.rotate).toEqual(false);
   }); 
});