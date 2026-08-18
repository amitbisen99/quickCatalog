const MOBILE_UA_REGEX = /Mobi|Android|iPhone|iPad|iPod/i;

/** Coarse mobile-vs-desktop split for analytics device breakdown — not
 * meant to be a precise device-detection library, just enough signal to
 * tell a vendor "most of your traffic is on phones" or not. */
function detectDevice(userAgent) {
  return userAgent && MOBILE_UA_REGEX.test(userAgent) ? 'mobile' : 'desktop';
}

module.exports = detectDevice;
