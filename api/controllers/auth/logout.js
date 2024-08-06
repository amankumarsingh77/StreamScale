async function logoutController(req, res) {
  try {
    res.clearCookie("token");
    return res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      status: "error",
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred during logout.",
    });
  }
}

module.exports = logoutController;
