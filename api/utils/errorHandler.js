const logger = require("./logger");

class AppError extends Error {
  constructor(statusCode, message, isOperational = true, stack = "") {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  if (!err.isOperational) {
    statusCode = 500;
    message = "Internal Server Error";
  }

  res.locals.errorMessage = err.message;

  const response = {
    code: statusCode,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  };

  logger.error(err);

  res.status(statusCode).json(response);
};

module.exports = {
  AppError,
  errorHandler,
};
