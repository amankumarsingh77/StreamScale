const userService = require("../services/user");
const logger = require("../utils/logger");
const { AppError } = require("../utils/errorHandler");

exports.register = async (req, res, next) => {
  try {
    const { username, email, password, fullname, message } = req.body;
    const user = await userService.createUser({
      username,
      email,
      password,
      fullname,
      message,
    });
    logger.info(`User registered successfully: ${username}`);
    res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: { userId: user._id },
    });
  } catch (error) {
    logger.error(`Error in user registration: ${error.message}`);
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError(500, "Registration failed", error.message));
    }
  }
};

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await userService.getUserByUsername(username);

    if (!user) {
      throw new AppError(401, "Invalid credentials");
    }
    const isPasswordValid = await userService.verifyPassword(user, password);
    if (!isPasswordValid) {
      throw new AppError(401, "Invalid credentials");
    }
    const token = userService.generateAuthToken(user._id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    logger.info(`User logged in successfully: ${username}`);
    res.status(200).json({
      status: "success",
      message: "Login successful",
      data: { userId: user._id },
    });
  } catch (error) {
    logger.error(`Error in user login: ${error.message}`);
    next(error);
  }
};

exports.logout = (req, res) => {
  res.clearCookie("token");
  logger.info("User logged out successfully");
  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
};

exports.getUserData = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    logger.info(`User data retrieved successfully: ${user.username}`);
    res.status(200).json({
      status: "success",
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullname: user.fullname,
          message: user.message,
          picture: user.picture,
        },
      },
    });
  } catch (error) {
    logger.error(`Error retrieving user data: ${error.message}`);
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { username, fullname, picture, message } = req.body;
    const user = await userService.isUsernameTaken(username);
    if (user) {
      logger.info(`Username already taken: ${username}`);
      return res.status(400).json({
        status: "failed",
        message: "Username already taken",
      });
    }
    const updatedUser = await userService.updateUser(req.userId, {
      username,
      fullname,
      picture,
      message,
    });

    if (!updatedUser) {
      throw new AppError(404, "User not found");
    }
    logger.info(`User updated successfully: ${updatedUser.username}`);
    res.status(200).json({
      status: "success",
      message: "User updated successfully",
      data: { user: updatedUser },
    });
  } catch (error) {
    logger.error(`Error updating user: ${error.message}`);
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError(400, "Update failed", error.message));
    }
  }
};
