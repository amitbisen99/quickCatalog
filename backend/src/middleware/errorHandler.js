const AppError = require('../utils/AppError');

exports.notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational === true;

  if (!isOperational) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message: isOperational ? err.message : 'Something went wrong. Please try again later.',
  });
};
