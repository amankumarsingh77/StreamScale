const { passwordEncrypt, verifyPassword } = require("../services/password");
const {
  createUser,
  getUser,
  userExist,
  getUserById,
  updateUser,
} = require("../services/user");
const jwt = require("jsonwebtoken");
const express = require("express");
const {
  registerSchema,
  loginSchema,
  updateUserSchema,
} = require("../utils/inputvalidation");
const { protectedRoute } = require("../middleware/auth");
const router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY;

router.post("/register", async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: "Validation error",
        status: 400,
        error: error.details[0].message,
      });
    }
    const { username, password, email, message, fullname } = value;
    const userExists = await userExist(username, email);
    if (userExists) {
      return res.status(400).json({
        message: "User already exists",
        status: 400,
      });
    }
    const hashedpassword = await passwordEncrypt(password);
    await createUser(username, hashedpassword, email, message, fullname);
    res.status(200).json({
      message: "User created successfully",
      status: 200,
    });
  } catch (error) {
    console.error(error);
    res.send(error.message);
  }
});

router.post("/login", async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: "Validation error",
        status: 400,
        error: error.details[0].message,
      });
    }
    const { username, password } = value;
    const user = await getUser(username);
    if (!user) {
      return res.status(400).json({
        message: "User not found",
        status: 400,
      });
    }
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        message: "Invalid password",
        status: 400,
      });
    }
    const token = jwt.sign({ userId: user._id }, SECRET_KEY, {
      expiresIn: "1h",
    });

    res.cookie("token", token, {
      httpOnly: true,
    });

    res.status(200).json({
      message: "Login successful",
      status: 200,
    });
  } catch (error) {
    console.error(error);
    res.send(error.message);
  }
});

router.post("/logout", (req, res) => {
  try {
    res.clearCookie("token");
    res.status(200).json({
      message: "Logged out successfully",
      status: 200,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      message: "Logout failed:" + error.message,
      status: 400,
    });
  }
});

router.get("/me", protectedRoute, async (req, res) => {
  const userId = req.userId;
  const user = await getUserById(userId);
  if (!user) {
    return res.status(404).json({
      message: "User not found",
      status: 404,
    });
  }
  res.status(200).json({
    message: "User found",
    status: 200,
    user,
  });
});

router.patch("/update", protectedRoute, async (req, res) => {
  const { error, value } = updateUserSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      message: "Validation error",
      status: 400,
      error: error.details[0].message,
    });
  }
  const { username, fullname, picture, message } = value;
  const userId = req.userId;
  const result = await updateUser(userId, username, fullname, picture, message);
  res.status(result.status).json({
    message: result.message,
    status: result.status,
  });
});

module.exports = router;
