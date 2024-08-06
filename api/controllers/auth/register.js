const {
  userExist,
  createUser,
  passwordEncrypt,
} = require("../../services/user");
const { registerSchema } = require("../../utils/inputvalidation");

async function registerController(req, res) {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: error.details[0].message,
      });
    }

    const { username, password, email, message, fullname } = value;
    const userExists = await userExist(username, email);
    if (userExists) {
      return res.status(409).json({
        status: "error",
        code: "USER_ALREADY_EXISTS",
        message: "A user with this username or email already exists",
      });
    }

    const hashedPassword = await passwordEncrypt(password);
    await createUser(username, hashedPassword, email, message, fullname);

    return res.status(201).json({
      status: "success",
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      status: "error",
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred. Please try again later.",
    });
  }
}

module.exports = registerController;
