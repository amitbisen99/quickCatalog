const multer = require('multer');
const AppError = require('../utils/AppError');

const EXCEL_MIME_TYPES = [
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const excelUploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter(req, file, cb) {
    const isExcel =
      EXCEL_MIME_TYPES.includes(file.mimetype) || /\.(xlsx|xls)$/i.test(file.originalname);
    if (!isExcel) {
      return cb(new AppError('Only Excel files (.xlsx, .xls) are supported', 400));
    }
    cb(null, true);
  },
});

// Translates Multer's own errors (e.g. file-too-large) into our
// standard AppError shape instead of letting them fall through as
// generic 500s.
function excelUpload(req, res, next) {
  excelUploader.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File is too large — the limit is 10MB', 400));
    }
    next(err);
  });
}

const ZIP_MIME_TYPES = ['application/zip', 'application/x-zip-compressed', 'application/x-zip', 'multipart/x-zip'];

const bulkImportUploader = multer({
  storage: multer.memoryStorage(),
  // 900MB — a zip of full-size product photos (hundreds of products,
  // several photos each) can get large; raised well past the old 20MB
  // default to support real-world-sized test/import photo sets.
  limits: { fileSize: 900 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (file.fieldname === 'file') {
      const isExcel = EXCEL_MIME_TYPES.includes(file.mimetype) || /\.(xlsx|xls)$/i.test(file.originalname);
      if (!isExcel) return cb(new AppError('Only Excel files (.xlsx, .xls) are supported', 400));
      return cb(null, true);
    }
    if (file.fieldname === 'imagesZip') {
      const isZip = ZIP_MIME_TYPES.includes(file.mimetype) || /\.zip$/i.test(file.originalname);
      if (!isZip) return cb(new AppError('Product images must be uploaded as a .zip file', 400));
      return cb(null, true);
    }
    cb(new AppError('Unexpected file field', 400));
  },
});

// Excel sheet + an optional ZIP of product photos, used together by the
// bulk product import flow.
function bulkImportUpload(req, res, next) {
  bulkImportUploader.fields([
    { name: 'file', maxCount: 1 },
    { name: 'imagesZip', maxCount: 1 },
  ])(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File is too large — the limit is 900MB', 400));
    }
    next(err);
  });
}

const imagesUploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per image
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new AppError('Only image files are supported', 400));
    }
    cb(null, true);
  },
});

function productImagesUpload(req, res, next) {
  imagesUploader.array('images', 3)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('Each image must be under 5MB', 400));
    }
    if (err instanceof multer.MulterError && err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError('A product can have at most 3 images', 400));
    }
    next(err);
  });
}

function profileImagesUpload(req, res, next) {
  imagesUploader.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ])(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('Each image must be under 5MB', 400));
    }
    next(err);
  });
}

module.exports = { excelUpload, bulkImportUpload, productImagesUpload, profileImagesUpload };
