const express = require("express");
const fileController = require("../controllers/fileController");
const { protectedRoute } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { addFileSchema } = require("../utils/inputvalidation");

const router = express.Router();

router.get("/getfile", protectedRoute, fileController.getFile);
router.get("/hlsurl", fileController.getHlsUrl);
router.get("/getfiles", protectedRoute, fileController.getUserFiles);
router.delete("/delete", protectedRoute, fileController.deleteFile);
router.patch('/:id', protectedRoute, fileController.updateFileDetails);
router.post(
  "/add",
  protectedRoute,
  validate(addFileSchema),
  fileController.addFile
);

module.exports = router;
