export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error(err);

  // Prisma not found error
  if (err.code === 'P2025') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Prisma unique constraint error
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    const message = `Duplicate value for ${field}`;
    error = { message, statusCode: 400 };
  }

  // Prisma foreign key constraint error
  if (err.code === 'P2003') {
    const message = 'Related record not found';
    error = { message, statusCode: 400 };
  }

  // Prisma validation error
  if (err.code === 'P2000') {
    const message = 'Value too long for column';
    error = { message, statusCode: 400 };
  }

  // Prisma invalid value error
  if (err.code === 'P2006') {
    const message = 'Invalid value provided';
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
