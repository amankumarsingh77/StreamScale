const express = require("express");
const userController = require("../controllers/userController");
const { protectedRoute } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  registerSchema,
  loginSchema,
  updateUserSchema,
} = require("../utils/inputvalidation");

const router = express.Router();

router.post("/signup", validate(registerSchema), userController.register);
router.post("/login", validate(loginSchema), userController.login);
router.post("/logout", userController.logout);
router.get("/me", protectedRoute, userController.getUserData);
router.patch(
  "/update",
  protectedRoute,
  validate(updateUserSchema),
  userController.updateUser
);

module.exports = router;
