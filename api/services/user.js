const { User } = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const createUser = async (username, password, email, message, fullname) => {
  try {
    const user = new User({ username, password, email, message, fullname });
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

const generateAuthToken = async (userId) => {
  const token = jwt.sign(
    { userId: userId.toString() },
    process.env.SECRET_KEY,
    {
      expiresIn: "1h",
    }
  );
  return token;
};

const getUserByUsername = async (username) => {
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

const updateUser = async (userId, username, fullname, picture, message) => {
  try {
    const emailExist = await userExist(username, null);
    if (emailExist) {
      return {
        message: "Username already exists",
        status: 400,
      };
    }
    const user = await User.findOneAndUpdate(
      { _id: userId },
      { username, fullname, picture, message }
    );
    if (!user) {
      return {
        message: "Could not update user details",
        status: 400,
      };
    }
    return {
      message: "Successfully updated user",
      status: 200,
    };
  } catch (error) {
    console.error("Error updating user", error);
  }
};

const passwordEncrypt = async (password) => {
  try {
    const hashedpassword = await bcrypt.hash(password, saltRounds);
    return hashedpassword;
  } catch (error) {
    console.error("Error hashing the password", error);
  }
};

const verifyPassword = async (password, hashedPassword) => {
  try {
    const match = await bcrypt.compare(password, hashedPassword);
    return match;
  } catch (error) {
    console.error("Error verifying the password", error);
  }
};

module.exports = {
  createUser,
  getUserByUsername,
  getUserById,
  userExist,
  isAllowedToUpload,
  updateUser,
  generateAuthToken,
  passwordEncrypt,
  verifyPassword,
};
