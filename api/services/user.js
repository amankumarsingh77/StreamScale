const { User } = require("../models/user");

const createUser = async (username, password, email, message) => {
  try {
    const user = new User({ username, password, email, message });
    await user.save();
    return user;
  } catch (error) {
    console.error("Error creating user", error);
  }
};

const getUserById = async (userId) => {
  try {
    const user = await User.findById(userId, { password: 0, files: 0 });
    if (user) return user;
    return null;
  } catch (error) {
    console.error("Error getting user", error);
  }
};

const getUser = async (username) => {
  try {
    const user = await User.findOne({ username });
    if (user) return user;
    return null;
  } catch (error) {
    console.error("Error getting user", error);
  }
};

const userExist = async (username, email) => {
  try {
    const userExist = await User.findOne({
      $or: [{ username }, { email }],
    });
    return !!userExist;
  } catch (error) {
    console.error("Error checking if user exists", error);
  }
};

const isAllowedToUpload = async (userId) => {
  try {
    const user = await User.findById(userId);
    return user.isAllowed;
  } catch (error) {
    console.error("Error checking if user is allowed to upload", error);
  }
};

module.exports = {
  createUser,
  getUser,
  getUserById,
  userExist,
  isAllowedToUpload,
};
