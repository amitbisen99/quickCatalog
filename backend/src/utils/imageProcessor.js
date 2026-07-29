const sharp = require('sharp');

/**
 * Resizes to fit within 800x800 and re-encodes as a compressed JPEG,
 * returned as a data URL for direct storage on the Product document.
 *
 * Interim architecture: real cloud storage (DigitalOcean Spaces) lands
 * in Prompt 19. Storing compressed images inline keeps this feature
 * fully working today; swapping the storage destination later doesn't
 * change this function's compression logic, only what happens to its
 * output buffer.
 */
async function compressImageToDataUrl(buffer) {
  const output = await sharp(buffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  return `data:image/jpeg;base64,${output.toString('base64')}`;
}

module.exports = { compressImageToDataUrl };
