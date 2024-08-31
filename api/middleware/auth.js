const jwt = require("jsonwebtoken");
const { AppError } = require("../utils/errorHandler");
const { jwt: jwtConfig } = require("../config/env");

const protectedRoute = (req, res, next) => {
  const { token } = req.cookies;
  if (!token) {
    throw new AppError(401, "Authentication required");
  }

  try {
    const { userId } = jwt.verify(token, jwtConfig.secret);
    req.userId = userId;
    next();
  } catch (error) {
    throw new AppError(401, "Invalid or expired token");
  }
};

module.exports = {
  protectedRoute,
};
