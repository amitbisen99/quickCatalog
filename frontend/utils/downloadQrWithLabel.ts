// Composes the plain QR code (as stored/displayed everywhere else) with
// the vendor's business name and a short call-to-action, but only for
// the downloaded file — the on-page <img> stays exactly as-is. Drawn
// client-side onto a canvas since the QR itself is already a data URL
// with nothing else baked into it.
export async function downloadQrWithLabel(
  qrDataUrl: string,
  businessName: string,
  filename: string
): Promise<void> {
  const qrImg = new Image();
  qrImg.src = qrDataUrl;
  await new Promise<void>((resolve, reject) => {
    qrImg.onload = () => resolve();
    qrImg.onerror = () => reject(new Error('Could not load QR code image'));
  });

  const width = 520;
  const padding = 40;
  const qrSize = 400;
  const nameFontSize = 26;
  const taglineFontSize = 16;
  const nameHeight = 34;
  const taglineHeight = 22;
  const gapAfterName = 6;
  const gapBeforeQr = 22;
  const height = padding + nameHeight + gapAfterName + taglineHeight + gapBeforeQr + qrSize + padding;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const maxTextWidth = width - padding * 2;

  ctx.fillStyle = '#111827';
  ctx.font = `700 ${nameFontSize}px Arial, sans-serif`;
  ctx.fillText(businessName, width / 2, padding, maxTextWidth);

  ctx.fillStyle = '#6b7280';
  ctx.font = `400 ${taglineFontSize}px Arial, sans-serif`;
  ctx.fillText('Scan to visit our catalogue', width / 2, padding + nameHeight + gapAfterName, maxTextWidth);

  const qrX = (width - qrSize) / 2;
  const qrY = padding + nameHeight + gapAfterName + taglineHeight + gapBeforeQr;
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename;
  a.click();
}
