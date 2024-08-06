const { addFile } = require("../../services/file");
const { isAllowedToUpload } = require("../../services/user");
const { addFileSchema } = require("../../utils/inputValidation");

async function addFileController(req, res) {
  try {
    const { error, value } = addFileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: error.details[0].message,
      });
    }

    const userId = req.userId;
    const isAllowed = await isAllowedToUpload(userId);
    if (!isAllowed) {
      return res.status(403).json({
        status: "error",
        code: "UPLOAD_NOT_ALLOWED",
        message: "You are not allowed to add files. Please contact admin.",
      });
    }

    const { fileName, size, type } = value;
    const sanitizedFileName = fileName.replace(/ /g, "");
    const filePath = `${userId}/${sanitizedFileName}`;

    const file = await addFile(
      sanitizedFileName,
      filePath,
      size,
      type,
      userId,
      "queued"
    );

    return res.status(201).json({
      status: "success",
      message: "File added successfully",
      data: { fileId: file._id },
    });
  } catch (error) {
    console.error("Error adding file:", error);
    return res.status(500).json({
      status: "error",
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred while adding the file.",
    });
  }
}

module.exports = addFileController;
