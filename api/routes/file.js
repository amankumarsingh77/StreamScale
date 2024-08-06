const express = require("express");
const { protectedRoute } = require("../middleware/auth");
const {
  getFileController,
  getHlsUrlController,
  getFilesController,
  deleteFileController,
} = require("../controllers/user.js/file");
const router = express.Router();

router.get("/getfile", protectedRoute, getFileController);

router.get("/hlsurl", protectedRoute, getHlsUrlController);

router.get("/getfiles", protectedRoute, getFilesController);

router.delete("/delete", protectedRoute, deleteFileController);

module.exports = router;
