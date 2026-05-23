import { Jimp } from "jimp";

async function removeBlackBackground() {
  try {
    const image = await Jimp.read('public/gundu2.0.png');
    
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
      const red = this.bitmap.data[idx + 0];
      const green = this.bitmap.data[idx + 1];
      const blue = this.bitmap.data[idx + 2];
      
      // If the pixel is very dark black
      if (red < 20 && green < 20 && blue < 20) {
        this.bitmap.data[idx + 3] = 0; // Make transparent
      }
    });

    await image.write('public/gundu2.0.png');
    console.log('Background removed successfully!');
  } catch (error) {
    console.error('Error processing image:', error);
  }
}

removeBlackBackground();
