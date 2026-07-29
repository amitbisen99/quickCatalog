const crypto = require('crypto');

/** Random 6-digit numeric OTP, zero-padded (e.g. "042817"). */
module.exports = function generateOtp() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
};
