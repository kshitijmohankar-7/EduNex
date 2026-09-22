function errorHandler(err, req, res, next) {
  const status = Number(err.status) || 500;
  const requestId = req.requestId;

  console.error({
    requestId,
    method: req.method,
    path: req.originalUrl,
    status,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });

  const safeMessage = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : (err.message || 'Internal server error');

  res.status(status).json({
    error: safeMessage,
    requestId,
  });
}

module.exports = errorHandler;
