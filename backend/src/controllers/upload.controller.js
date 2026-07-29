const { parseWorkbook } = require('../utils/excelParser');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const notImplemented = require('../utils/notImplemented');

exports.parseCatalog = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  const { headers, records, sheetNames } = parseWorkbook(req.file.buffer);
  if (headers.length === 0) {
    throw new AppError('Could not detect any columns in this file — make sure the first row has headers', 400);
  }

  res.json({
    success: true,
    headers,
    dataPreview: records.slice(0, 5),
    totalRows: records.length,
    sheetNames,
  });
});

exports.uploadImages = notImplemented('POST /api/upload/images');
exports.uploadVideo = notImplemented('POST /api/upload/video');
exports.uploadFile = notImplemented('POST /api/upload/file');
