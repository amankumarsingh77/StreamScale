const jwt = require("jsonwebtoken");
const { getUserById } = require("../services/user");

const protectedRoute = (req, res, next) => {
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({
      message: "Not authorized",
      status: 401,
    });
  }
  try {
    const { userId } = jwt.verify(token, process.env.SECRET_KEY);
    req.userId = userId;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid token",
      status: 401,
    });
  }
};

module.exports = {
  protectedRoute,
};
