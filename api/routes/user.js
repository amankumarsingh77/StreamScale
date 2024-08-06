const express = require("express");
const { protectedRoute } = require("../middleware/auth");
const registerController = require("../controllers/auth/register");
const signInController = require("../controllers/auth/signin");
const logoutController = require("../controllers/auth/logout");
const userDataController = require("../controllers/auth/data");
const updateUserController = require("../controllers/auth/update");

const router = express.Router();

router.post("/signup", registerController);

router.post("/login", signInController);

router.post("/logout", logoutController);

router.get("/me", protectedRoute, userDataController);

router.patch("/update", protectedRoute, updateUserController);

module.exports = router;
