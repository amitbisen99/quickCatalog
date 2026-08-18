const AdmZip = require('adm-zip');
const AppError = require('./AppError');

/**
 * Reads an uploaded ZIP of product photos into a filename → entry map,
 * keyed by lowercased basename (folders inside the zip are ignored) so
 * a sheet row referencing "Shirt1.JPG" matches an entry stored as
 * "photos/shirt1.jpg".
 *
 * Deliberately stores the ZipEntry itself, not its decompressed data —
 * entry.getData() is what actually decompresses, and callers should only
 * do that for the specific files a row references, when it needs them
 * (see resolveRowImages). Eagerly decompressing every entry up front,
 * for a ZIP with dozens/hundreds of full-resolution photos, could easily
 * mean hundreds of MB to a few GB held in memory at once regardless of
 * how many (if any) of those photos a row actually uses — enough to
 * crash a memory-constrained production instance outright.
 */
function readImagesZip(buffer) {
  let zip;
  try {
    zip = new AdmZip(buffer);
  } catch (err) {
    throw new AppError('Could not read the images ZIP — is it a valid .zip file?', 400);
  }

  const map = new Map();
  zip.getEntries().forEach((entry) => {
    if (entry.isDirectory) return;
    const basename = entry.entryName.split('/').pop();
    if (basename) map.set(basename.toLowerCase(), entry);
  });
  return map;
}

module.exports = readImagesZip;
