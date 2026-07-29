const AdmZip = require('adm-zip');
const AppError = require('./AppError');

/**
 * Reads an uploaded ZIP of product photos into a filename → buffer map,
 * keyed by lowercased basename (folders inside the zip are ignored) so
 * a sheet row referencing "Shirt1.JPG" matches an entry stored as
 * "photos/shirt1.jpg".
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
    if (basename) map.set(basename.toLowerCase(), entry.getData());
  });
  return map;
}

module.exports = readImagesZip;
