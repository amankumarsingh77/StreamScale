const { updateUser } = require("../../services/user");
const { updateUserSchema } = require("../../utils/inputvalidation");

async function updateUserController(req, res) {
  try {
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: error.details[0].message,
      });
    }

    const { username, fullname, picture, message } = value;
    const userId = req.userId;
    const user = await updateUser(userId, username, fullname, picture, message);

    return res.status(user.status).json({
      status: user.status === 200 ? "success" : "error",
      message: user.message,
    });
  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({
      status: "error",
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred while updating user data.",
    });
  }
}

module.exports = updateUserController;
