const { getUserById } = require("../../services/user");

async function userDataController(req, res) {
  try {
    const userId = req.userId;
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    return res.status(200).json({
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
    console.error("Get user error:", error);
    return res.status(500).json({
      status: "error",
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred while fetching user data.",
    });
  }
}

module.exports = userDataController;
