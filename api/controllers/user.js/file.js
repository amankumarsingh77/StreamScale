const mongoose = require("mongoose");
const {
  getFile,
  getHlsUrl,
  getFiles,
  deleteFile,
} = require("../../services/file");
const { generatePresignedUrl } = require("../../services/aws");
const { isAllowedToUpload } = require("../../services/user");
const { addFileSchema } = require("../../utils/inputValidation");
const { addFile, updateFileStatusByPath } = require("../../services/file");

async function getFileController(req, res) {
  try {
    const { fileId } = req.query;
    const file = await getFile(fileId);

    if (!file) {
      return res.status(404).json({
        status: "error",
        code: "FILE_NOT_FOUND",
        message: "File not found",
      });
    }

    const hlsUrl = await getHlsUrl(file.path);
    file.hlsUrl = hlsUrl;

    return res.status(200).json({
      status: "success",
      data: { file },
    });
  } catch (error) {
    console.error("Error fetching file:", error);
    return res.status(500).json({
      status: "error",
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred while fetching the file.",
    });
  }
}

async function getHlsUrlController(req, res) {
  try {
    const { id } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        code: "INVALID_ID",
        message: "Invalid file ID",
      });
    }

    const file = await getFile(id);
    if (!file) {
      return res.status(404).json({
        status: "error",
        code: "FILE_NOT_FOUND",
        message: "File not found",
      });
    }

    const hlsUrl = await getHlsUrl(file.path);
    if (!hlsUrl) {
      return res.status(404).json({
        status: "error",
        code: "HLS_URL_NOT_FOUND",
        message: "HLS URL not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: { hlsUrl },
    });
  } catch (error) {
    console.error("Error fetching HLS URL:", error);
    return res.status(500).json({
      status: "error",
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred while fetching the HLS URL.",
    });
  }
}

async function getFilesController(req, res) {
  try {
    const userId = req.userId;
    const files = await getFiles(userId);

    if (!files || files.length === 0) {
      return res.status(404).json({
        status: "error",
        code: "FILES_NOT_FOUND",
        message: "No files found for this user",
      });
    }

    return res.status(200).json({
      status: "success",
      data: { files },
    });
  } catch (error) {
    console.error("Error fetching files:", error);
    return res.status(500).json({
      status: "error",
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred while fetching files.",
    });
  }
}

async function deleteFileController(req, res) {
  try {
    const { fileId } = req.query;
    const file = await getFile(fileId);

    if (!file) {
      return res.status(404).json({
        status: "error",
        code: "FILE_NOT_FOUND",
        message: "File not found",
      });
    }

    await deleteFile(fileId);

    return res.status(200).json({
      status: "success",
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    return res.status(500).json({
      status: "error",
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred while deleting the file.",
    });
  }
}

async function getUploadUrlController(req, res) {
  try {
    const { fileName } = req.query;
    const userId = req.userId;

    if (!fileName) {
      return res.status(400).json({
        status: "error",
        code: "MISSING_FILENAME",
        message: "File name is required",
      });
    }

    const sanitizedFileName = fileName.replace(/ /g, "");

    const isAllowed = await isAllowedToUpload(userId);
    if (!isAllowed) {
      return res.status(403).json({
        status: "error",
        code: "UPLOAD_NOT_ALLOWED",
        message: "You are not allowed to upload. Please contact admin.",
      });
    }

    const url = await generatePresignedUrl(`${userId}/${sanitizedFileName}`);

    return res.status(200).json({
      status: "success",
      message: "Presigned URL generated successfully",
      data: { url },
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return res.status(500).json({
      status: "error",
      code: "INTERNAL_SERVER_ERROR",
      message:
        "An unexpected error occurred while generating the presigned URL.",
    });
  }
}

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

async function updateFileStatusController(req, res) {
  try {
    const { key, status } = req.body;

    if (!key || !status) {
      return res.status(400).json({
        status: "error",
        code: "MISSING_PARAMETERS",
        message: "Both key and status are required",
      });
    }

    await updateFileStatusByPath(key, status);

    return res.status(200).json({
      status: "success",
      message: "File status updated successfully",
    });
  } catch (error) {
    console.error("Error updating file status:", error);
    return res.status(500).json({
      status: "error",
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred while updating the file status.",
    });
  }
}

module.exports = {
  getFileController,
  getHlsUrlController,
  getFilesController,
  deleteFileController,
  getUploadUrlController,
  addFileController,
  updateFileStatusController,
};
