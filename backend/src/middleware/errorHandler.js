export function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  })
}

export function globalErrorHandler(err, req, res, next) {
  console.error('Unhandled Server Error:', err)

  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal server error'

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  })
}
