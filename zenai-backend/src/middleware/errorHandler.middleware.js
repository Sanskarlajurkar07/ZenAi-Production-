// src/middleware/errorHandler.middleware.js
const logger = require('../utils/logger');

// 404 - Not Found handler
exports.notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Global error handler
exports.errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  logger.error('Error:', {
    status: statusCode,
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  res.status(statusCode).json({
    success: false,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
