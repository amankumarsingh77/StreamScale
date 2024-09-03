const express = require("express");
const uploadController = require("../controllers/uploadController");
const { protectedRoute } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  getUploadUrlSchema,
  addFileSchema,
} = require("../utils/inputvalidation");

const router = express.Router();

router.get(
  "/url",
  protectedRoute,
  // validate(getUploadUrlSchema),
  uploadController.getUploadUrl
);
router.post(
  "/add",
  protectedRoute,
  validate(addFileSchema),
  uploadController.addFile
);

module.exports = router;
