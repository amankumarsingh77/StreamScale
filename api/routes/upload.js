const express = require("express");
const { generatePresignedUrl } = require("../services/aws");
const { addFile } = require("../services/file");
const { isAllowedToUpload } = require("../services/user");

const { AddFileSchema } = require("../utils/inputvalidation");
const { protectedRoute } = require("../middleware/auth");

const router = express.Router();

router.get("/url", protectedRoute, async (req, res) => {
  const fileName = req.query.fileName.replace(/ /g, "");
  const userId = req.userId;
  if (!fileName) {
    return res.status(400).json({ error: "File name is required" });
  }
  if ((await isAllowedToUpload(userId)) === false) {
    return res
      .status(400)
      .json({ error: "You are not allowed to upload. Please contact admin" });
  }

  try {
    const url = await generatePresignedUrl(`${userId}/${fileName}`);
    res.status(200).json({
      message: "Presigned URL generated successfully",
      url,
    });
  } catch (error) {
    console.error("Error generating presigned URL", error);
    res.status(500).json({ error: "Error generating presigned URL" });
  }
});

router.post("/add", protectedRoute, async (req, res) => {
  const { error, value } = AddFileSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      message: "Validation error",
      status: 400,
      error: error.details[0].message,
    });
  }
  const userId = req.userId;
  if ((await isAllowedToUpload(userId)) === false) {
    return res.status(400).json({
      error: "You are not allowed to add files. Please contact admin",
    });
  }
  const { fileName, size, type } = value;
  const finalFileName = fileName.replace(/ /g, "");
  const filePath = `${userId}/${finalFileName}`;
  const file = await addFile(
    finalFileName,
    filePath,
    size,
    type,
    userId,
    "queued"
  );
  res.status(200).json({
    message: "File added successfully",
    status: 200,
    fileId: file._id,
  });
});

module.exports = router;
