const QRCode = require('qrcode');

/** Returns a data:image/png;base64,... string — no external file storage needed. */
module.exports = function generateQrCodeDataUrl(url) {
  return QRCode.toDataURL(url, { margin: 1, width: 320 });
};
