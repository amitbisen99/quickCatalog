const PDFDocument = require('pdfkit');

const COLORS = {
  primary700: '#232153',
  gold400: '#F8D548',
  gold800: '#947A10',
  textDark: '#111827',
  textGray: '#6B7280',
  textLight: '#9CA3AF',
  textMuted: '#B4B2D6',
  border: '#E5E7EB',
  cardBg: '#FFFFFF',
  imagePlaceholder: '#F3F4F6',
  specDivider: '#D1D5DB',
};

// pdfkit's built-in fonts use WinAnsi encoding, which doesn't include the
// ₹ glyph (Indian Rupee is a relatively recent Unicode addition, absent
// from every base-14 PDF font) — every other currency this app supports
// renders fine, so only INR needs an ASCII-safe stand-in here.
const PDF_CURRENCY_LABELS = {
  INR: 'Rs. ',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED ',
  SAR: 'SAR ',
  SGD: 'S$',
  AUD: 'A$',
  CAD: 'C$',
  JPY: '¥',
  CNY: '¥',
  CHF: 'CHF ',
  ZAR: 'R',
  NZD: 'NZ$',
  HKD: 'HK$',
};

function currencyLabel(code) {
  return PDF_CURRENCY_LABELS[code] || 'Rs. ';
}

function initialsOf(name) {
  return (name || 'QC')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** Decodes a stored data-URL image, or fetches an external one, into a Buffer pdfkit can embed. Returns null (never throws) on any failure so one bad image doesn't break the whole PDF. */
async function resolveImageBuffer(src) {
  if (!src) return null;
  try {
    if (src.startsWith('data:')) {
      const base64 = src.split(',')[1];
      return base64 ? Buffer.from(base64, 'base64') : null;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(src, { signal: controller.signal });
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    return null;
  }
}

const PAGE_MARGIN = 40;
const HEADER_HEIGHT = 130;
const HEADER_ACCENT_HEIGHT = 3;
const CONTINUATION_BAND_HEIGHT = 40;
const FOOTER_HEIGHT = 34;
const ROWS_PER_PAGE = 4;
const ROW_GAP = 14;
const CARD_PADDING = 12;
const MAX_SPECS = 4;
const LOGO_SIZE = 42;

async function drawLogo(doc, vendor, x, y) {
  const buffer = await resolveImageBuffer(vendor?.logo);
  doc.save();
  doc.roundedRect(x, y, LOGO_SIZE, LOGO_SIZE, 8).clip();
  if (buffer) {
    doc.rect(x, y, LOGO_SIZE, LOGO_SIZE).fill('#FFFFFF');
    try {
      doc.image(buffer, x, y, { fit: [LOGO_SIZE, LOGO_SIZE], align: 'center', valign: 'center' });
    } catch (err) {
      // Unsupported/corrupt logo image — falls through to the initials
      // badge drawn below instead.
    }
  }
  doc.restore();
  if (!buffer) {
    doc.roundedRect(x, y, LOGO_SIZE, LOGO_SIZE, 8).fill(COLORS.gold400);
    doc
      .fillColor(COLORS.primary700)
      .font('Helvetica-Bold')
      .fontSize(15)
      .text(initialsOf(vendor?.businessName), x, y + LOGO_SIZE / 2 - 7, { width: LOGO_SIZE, align: 'center' });
  }
}

async function drawHeader(doc, { catalog, vendor, pageWidth, pageIndex, productsCount }) {
  const vendorName = (vendor?.businessName || catalog.name).toUpperCase();

  if (pageIndex === 1) {
    doc.rect(0, 0, doc.page.width, HEADER_HEIGHT).fill(COLORS.primary700);

    // eslint-disable-next-line no-await-in-loop
    await drawLogo(doc, vendor, PAGE_MARGIN, 18);

    const textX = PAGE_MARGIN + LOGO_SIZE + 14;
    const textWidth = pageWidth - LOGO_SIZE - 14;
    doc
      .fillColor(COLORS.gold400)
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(vendorName, textX, 22, { width: textWidth, characterSpacing: 1.2 });
    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(18)
      .text(catalog.name, textX, 36, { width: textWidth, height: 22, ellipsis: true });

    if (catalog.description) {
      doc
        .fillColor(COLORS.textMuted)
        .font('Helvetica')
        .fontSize(9)
        .text(catalog.description, PAGE_MARGIN, 68, { width: pageWidth, height: 26, ellipsis: true });
    }

    const meta = `Generated ${new Date().toLocaleDateString()}  ·  ${productsCount} product${productsCount === 1 ? '' : 's'}`;
    doc.fillColor(COLORS.textMuted).font('Helvetica').fontSize(8.5).text(meta, PAGE_MARGIN, 102, { width: pageWidth });
  } else {
    // Lighter running header on continuation pages — same total reserved
    // height as page 1 so every page's row grid lines up identically.
    doc.rect(0, 0, doc.page.width, CONTINUATION_BAND_HEIGHT).fill(COLORS.primary700);
    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(catalog.name, PAGE_MARGIN, 13, { width: pageWidth * 0.6, height: 14, ellipsis: true });
    doc
      .fillColor(COLORS.gold400)
      .font('Helvetica')
      .fontSize(8)
      .text(vendorName, PAGE_MARGIN, 15, { width: pageWidth, align: 'right' });
  }

  doc.rect(0, HEADER_HEIGHT - HEADER_ACCENT_HEIGHT, doc.page.width, HEADER_ACCENT_HEIGHT).fill(COLORS.gold400);
}

function drawFooter(doc, { pageWidth, pageIndex, totalPages }) {
  const y = doc.page.height - FOOTER_HEIGHT;
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + pageWidth, y).lineWidth(1).strokeColor(COLORS.border).stroke();
  doc
    .fillColor(COLORS.textLight)
    .font('Helvetica')
    .fontSize(8)
    .text(`Page ${pageIndex} of ${totalPages}`, PAGE_MARGIN, y + 11, { width: pageWidth / 2 });
  doc.text('Powered by QuickCatalog', PAGE_MARGIN, y + 11, { width: pageWidth, align: 'right' });
}

async function drawProductRow(doc, product, { x, y, width, height, symbol, categoryName }) {
  const cardHeight = height - ROW_GAP;

  doc.lineWidth(1);
  doc.roundedRect(x, y, width, cardHeight, 8).fillAndStroke(COLORS.cardBg, COLORS.border);

  const imgSize = cardHeight - CARD_PADDING * 2;
  const imgX = x + CARD_PADDING;
  const imgY = y + CARD_PADDING;

  doc.save();
  doc.roundedRect(imgX, imgY, imgSize, imgSize, 6).clip();
  doc.rect(imgX, imgY, imgSize, imgSize).fill(COLORS.imagePlaceholder);
  const imageBuffer = await resolveImageBuffer(product.images && product.images[0]);
  if (imageBuffer) {
    try {
      doc.image(imageBuffer, imgX, imgY, { fit: [imgSize, imgSize], align: 'center', valign: 'center' });
    } catch (err) {
      // Unsupported/corrupt image (pdfkit only reads JPEG/PNG) — the gray
      // placeholder fill drawn above stays visible instead.
    }
  }
  doc.restore();
  if (!imageBuffer) {
    doc
      .fillColor(COLORS.textLight)
      .font('Helvetica')
      .fontSize(7.5)
      .text('No image', imgX, imgY + imgSize / 2 - 4, { width: imgSize, align: 'center' });
  }

  const textX = imgX + imgSize + 16;
  const textRight = x + width - CARD_PADDING;
  const textWidth = textRight - textX;
  const rowBottom = y + cardHeight - CARD_PADDING;
  let cursorY = y + CARD_PADDING;

  if (categoryName) {
    doc
      .fillColor(COLORS.gold800)
      .font('Helvetica-Bold')
      .fontSize(8)
      .text(categoryName.toUpperCase(), textX, cursorY, { width: textWidth, characterSpacing: 0.5 });
    cursorY += 14;
  }

  doc
    .fillColor(COLORS.textDark)
    .font('Helvetica-Bold')
    .fontSize(13)
    .text(product.name, textX, cursorY, { width: textWidth, height: 16, ellipsis: true });
  cursorY += 20;

  doc.fillColor(COLORS.primary700).font('Helvetica-Bold').fontSize(13).text(`${symbol}${product.price}`, textX, cursorY, {
    continued: true,
  });
  const taxNote = product.taxPercent ? `   +${product.taxPercent}% tax` : '';
  doc
    .fillColor(COLORS.textGray)
    .font('Helvetica')
    .fontSize(9)
    .text(` / ${product.unit || 'pcs'}${taxNote}`);
  cursorY += 18;

  doc
    .fillColor(COLORS.textGray)
    .font('Helvetica')
    .fontSize(8.5)
    .text(`MOQ: ${product.minimumOrderQuantity || 1} ${product.unit || 'pcs'}`, textX, cursorY, { width: textWidth });
  cursorY += 16;

  const specs = Object.entries(product.specifications || {}).slice(0, MAX_SPECS);
  if (specs.length) {
    doc.font('Helvetica').fontSize(8.5);
    let specX = textX;
    const specRight = textRight;
    let specY = cursorY;
    specs.forEach(([key, value], index) => {
      if (index > 0) {
        if (specX + 10 > specRight) {
          specX = textX;
          specY += 13;
        }
        doc.strokeColor(COLORS.specDivider).lineWidth(1);
        doc.moveTo(specX + 4, specY + 1).lineTo(specX + 4, specY + 9).stroke();
        specX += 10;
      }
      const label = `${key}: ${value}`;
      const labelWidth = doc.widthOfString(label);
      if (specX + labelWidth > specRight && specX !== textX) {
        specX = textX;
        specY += 13;
      }
      if (specY + 10 <= rowBottom) {
        doc.fillColor(COLORS.textGray).text(label, specX, specY, { width: specRight - specX, height: 10, ellipsis: true, lineBreak: false });
      }
      specX += labelWidth + 2;
    });
  }
}

/**
 * Builds a branded, paginated catalog PDF and returns the PDFDocument
 * (itself a readable stream) — the caller sets response headers and
 * pipes it out.
 *
 * Layout is fixed at 4 products per page, one per row (rowHeight is a
 * constant fraction of the page), so pagination is driven purely by
 * `Math.ceil(products.length / 4)` rather than by measuring overflow —
 * that keeps the page count exact and rules out a trailing blank page.
 */
async function generateCatalogPdf({ catalog, vendor, categories, products }) {
  // Zero margins: every position in this file is placed manually against
  // PAGE_MARGIN, and pdfkit's own margin box would otherwise treat the
  // footer (deliberately drawn a few points inside a default 40pt margin)
  // as an overflow and silently insert extra blank pages to "fit" it.
  const doc = new PDFDocument({ size: 'A4', margins: { top: 0, bottom: 0, left: 0, right: 0 } });

  const pageWidth = doc.page.width - PAGE_MARGIN * 2;
  const contentAreaHeight = doc.page.height - PAGE_MARGIN * 2 - HEADER_HEIGHT - FOOTER_HEIGHT;
  const rowHeight = contentAreaHeight / ROWS_PER_PAGE;
  const totalPages = Math.max(Math.ceil(products.length / ROWS_PER_PAGE), 1);

  const symbol = currencyLabel(vendor?.currency);
  const categoryName = (id) => categories.find((c) => String(c.id) === String(id))?.name;

  let pageIndex = 1;
  await drawHeader(doc, { catalog, vendor, pageWidth, pageIndex, productsCount: products.length });
  drawFooter(doc, { pageWidth, pageIndex, totalPages });

  if (products.length === 0) {
    doc
      .fillColor(COLORS.textGray)
      .font('Helvetica')
      .fontSize(11)
      .text('This catalog has no products yet.', PAGE_MARGIN, PAGE_MARGIN + HEADER_HEIGHT + 20);
  }

  for (let i = 0; i < products.length; i += 1) {
    const posInPage = i % ROWS_PER_PAGE;
    if (i > 0 && posInPage === 0) {
      doc.addPage();
      pageIndex += 1;
      // eslint-disable-next-line no-await-in-loop
      await drawHeader(doc, { catalog, vendor, pageWidth, pageIndex, productsCount: products.length });
      drawFooter(doc, { pageWidth, pageIndex, totalPages });
    }

    const rowY = PAGE_MARGIN + HEADER_HEIGHT + posInPage * rowHeight;
    // eslint-disable-next-line no-await-in-loop
    await drawProductRow(doc, products[i], {
      x: PAGE_MARGIN,
      y: rowY,
      width: pageWidth,
      height: rowHeight,
      symbol,
      categoryName: categoryName(products[i].categoryId),
    });
  }

  doc.end();
  return doc;
}

module.exports = generateCatalogPdf;
