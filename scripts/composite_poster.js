import { Jimp } from 'jimp';

async function main() {
  const backgroundPath = 'C:/Users/Bishnupriya Panda/.gemini/antigravity/brain/3eecb647-25fb-42b0-97ab-e4f92d639b82/showcase_offer_banner_odia_1780441491851.png';
  const mascotPath = 'D:/WebApp/utkalskillcentre-main/public/gundulu-v3.png';
  const outputPath = 'D:/WebApp/utkalskillcentre-main/public/showcase_offer_poster.png';

  console.log('Loading images...');
  const background = await Jimp.read(backgroundPath);
  const mascot = await Jimp.read(mascotPath);

  console.log(`Background dimensions: ${background.bitmap.width}x${background.bitmap.height}`);
  console.log(`Mascot dimensions: ${mascot.bitmap.width}x${mascot.bitmap.height}`);

  // Create a circular crop of the mascot
  const size = Math.min(mascot.bitmap.width, mascot.bitmap.height);
  const radius = size / 2;
  const centerX = mascot.bitmap.width / 2;
  const centerY = mascot.bitmap.height / 2;

  // Colors for neon emerald border
  const borderR = 16;
  const borderG = 185;
  const borderB = 129;
  const borderWidth = Math.round(size * 0.025); // 2.5% of size for a thick border

  mascot.scan(0, 0, mascot.bitmap.width, mascot.bitmap.height, function (x, y, idx) {
    const dx = x - centerX;
    const dy = y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > radius) {
      this.bitmap.data[idx + 3] = 0; // Make transparent outside the circle
    } else if (dist > radius - borderWidth) {
      // Draw neon border
      this.bitmap.data[idx] = borderR;
      this.bitmap.data[idx + 1] = borderG;
      this.bitmap.data[idx + 2] = borderB;
      this.bitmap.data[idx + 3] = 255;
    }
  });

  // Crop to circle bounds
  mascot.crop({
    x: Math.round(centerX - radius),
    y: Math.round(centerY - radius),
    w: size,
    h: size
  });

  // Resize circular mascot to 22% of background width
  const mascotTargetWidth = Math.round(background.bitmap.width * 0.22);
  mascot.resize({ w: mascotTargetWidth });

  // Place circular mascot in the top-right corner, below the offer text
  const mascotX = background.bitmap.width - mascot.bitmap.width - 90;
  const mascotY = 210;

  background.composite(mascot, mascotX, mascotY, {
    mode: Jimp.BLEND_SOURCE_OVER,
    opacitySource: 1.0
  });

  console.log('Saving composed image...');
  await background.write(outputPath);
  console.log('Done!');
}

main().catch(err => {
  console.error(err);
});
