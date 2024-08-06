const { verifyPassword } = require("../../services/user");
const { getUserByUsername, generateAuthToken } = require("../../services/user");
const { loginSchema } = require("../../utils/inputvalidation");

async function signInController(req, res) {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: error.details[0].message,
      });
    }

    const { username, password } = value;
    const user = await getUserByUsername(username);

    if (!user) {
      return res.status(401).json({
        status: "error",
        code: "INVALID_CREDENTIALS",
        message: "Invalid username or password",
      });
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        code: "INVALID_CREDENTIALS",
        message: "Invalid username or password",
      });
    }

    const token = await generateAuthToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    return res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        userId: user._id,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      status: "error",
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred. Please try again later.",
    });
  }
}

module.exports = signInController;
