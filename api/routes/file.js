const express = require("express");
const {
  getFile,
  getHlsUrl,
  getFiles,
  deleteFile,
} = require("../services/file");
const { protectedRoute } = require("../middleware/auth");
const { default: mongoose } = require("mongoose");
const router = express.Router();

router.get("/getfile", protectedRoute, async (req, res) => {
  const fileId = req.query.fileId;
  const file = await getFile(fileId);
  if (!file) {
    res.status(404).json({
      message: "File not found",
      status: 404,
    });
  }
  res.status(200).json({
    message: "File found",
    status: 200,
    file,
  });
});

router.get("/hlsurl", protectedRoute, async (req, res) => {
  const id = req.query.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid id",
      status: 400,
    });
  }
  const file = await getFile(id);
  if (!file) {
    res.status(404).json({
      message: "File not found",
      status: 404,
    });
  }
  const hlsurl = await getHlsUrl(file.path);
  if (!hlsurl) {
    res.status(404).json({
      message: "HLS URL not found",
      status: 404,
    });
  }
  res.status(200).json({
    message: "successful",
    status: 200,
    hlsurl,
  });
});

router.get("/getfiles", protectedRoute, async (req, res) => {
  const userId = req.userId;
  const files = await getFiles(userId);
  if (!files) {
    res.status(404).json({
      message: "Files not found",
      status: 404,
    });
  }
  res.status(200).json({
    message: "Files found",
    status: 200,
    files,
  });
});

router.delete("/delete", protectedRoute, async (req, res) => {
  const { fileId } = req.query;
  const file = await getFile(fileId);
  if (!file) {
    return res.status(404).json({
      message: "File not found",
      status: 404,
    });
  }
  await deleteFile(fileId);
  res.status(200).json({
    message: "File deleted successfully",
    status: 200,
  });
});

module.exports = router;
