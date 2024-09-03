const userService = require("../services/user");
const fileService = require("../services/file");
const awsService = require("../services/aws");
const logger = require("../utils/logger");
const path = require("path");
const { AppError } = require("../utils/errorHandler");
const { v4: uuidv4 } = require("uuid");
const {
  validateFileName,
  validateFileMetadata,
} = require("../utils/fileValidator");

exports.getUploadUrl = async (req, res, next) => {
  try {
    const { fileName } = req.query;

    if (!validateFileName(fileName)) {
      throw new AppError(400, "Invalid file name");
    }

    const isAllowed = await userService.isAllowedToUpload(req.userId);
    if (!isAllowed) {
      throw new AppError(
        403,
        "You are not allowed to upload. Please contact admin."
      );
    }

    const fileExtension = path.extname(fileName);
    const uploadId = uuidv4().replace(/-/g,"");
    const uniqueFileName = `${uuidv4().replace(/-/g, "")}${fileExtension}`;
    const s3Key = `${req.userId}/${uploadId}/${uniqueFileName}`;
    const url = await awsService.generatePresignedUrl(s3Key);

    logger.info(`Presigned URL generated successfully for file: ${fileName}`);
    res.status(200).json({
      status: "success",
      message: "Presigned URL generated successfully",
      data: { url, filepath: s3Key, uploadId },
    });
  } catch (error) {
    logger.error(`Error generating presigned URL: ${error.message}`);
    next(error);
  }
};

exports.addFile = async (req, res, next) => {
  try {
    const { fileName, size, type, filePath, uploadId } = req.body;
    if (!validateFileMetadata(fileName, size, type, filePath, uploadId)) {
      throw new AppError(400, "Invalid file metadata");
    }

    const isAllowed = await userService.isAllowedToUpload(req.userId);
    if (!isAllowed) {
      throw new AppError(
        403,
        "You are not allowed to add files. Please contact admin."
      );
    }

    const file = await fileService.addFile(
      {
        name: fileName,
        path: filePath,
        uploadId,
        size,
        type,
      },
      req.userId
    );

    logger.info(`File added successfully: ${file.name}`);
    res.status(201).json({
      status: "success",
      message: "File added successfully",
      data: { fileId: file._id },
    });
  } catch (error) {
    logger.error(`Error adding file: ${error.message}`);
    next(error);
  }
};
