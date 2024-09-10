// services/user.js
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { AppError } = require("../utils/errorHandler");

const createUser = async (userData) => {
  try {
    const user = new User(userData);
    await user.save();
    return user;
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError(409, "User already exists");
    }
    throw new AppError(500, "Error creating user", error.message);
  }
};

const isUsernameTaken = async (username) => {
  const user = await User.findOne({ username });
  return !!user;
};

const getUserByUsername = async (username) => {
  const user = await User.findOne({ username });
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return user;
};

const getUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return user;
};

const updateUser = async (userId, updateData) => {
  const user = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  });
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return { ...user._doc, password: undefined, files: undefined };
};

const verifyPassword = async (user, password) => {
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new AppError(401, "Invalid credentials");
  }
  return isValid;
};

const generateAuthToken = (userId) => {
  return jwt.sign({ userId: userId.toString() }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

const isAllowedToUpload = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return user.isAllowed;
};

const getLatestTranscodingTasks = async (userId, limit = 5) => {
  try {
    const user = await User.findById(userId).populate({
      path: "files",
      options: { sort: { createdAt: -1 }, limit: limit },
      select: "name status progress createdAt",
    });

    if (!user) {
      throw new AppError(404, "User not found");
    }

    return user.files.map((file) => ({
      id: file._id,
      name: file.name,
      status: file.status,
      progress: file.progress || 0,
      createdAt: file.createdAt,
    }));
  } catch (error) {
    throw new AppError(500, "Error fetching transcoding tasks", error.message);
  }
};

module.exports = {
  createUser,
  getUserByUsername,
  getUserById,
  updateUser,
  verifyPassword,
  generateAuthToken,
  isAllowedToUpload,
  isUsernameTaken,
  getLatestTranscodingTasks,
};
