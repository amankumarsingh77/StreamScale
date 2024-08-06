const express = require("express");
const { protectedRoute } = require("../middleware/auth");
const {
  getUploadUrlController,
  addFileController,
} = require("../controllers/user.js/file");

const router = express.Router();

router.get("/url", protectedRoute, getUploadUrlController);

router.post("/add", protectedRoute, addFileController);

module.exports = router;
