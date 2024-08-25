const fileService = require("../services/file");
const logger = require("../utils/logger");
const { AppError } = require("../utils/errorHandler");

exports.getFile = async (req, res, next) => {
  try {
    const { fileId } = req.query;
    const file = await fileService.getFileById(fileId);
    const hlsUrl = fileService.getHlsUrl(file.path);

    logger.info(`File retrieved successfully: ${file.name}`);
    res.status(200).json({
      status: "success",
      data: { ...file.toObject(), hlsUrl },
    });
  } catch (error) {
    logger.error(`Error retrieving file: ${error.message}`);
    next(error);
  }
};

exports.getHlsUrl = async (req, res, next) => {
  try {
    const { id } = req.query;
    console.log(id);
    const file = await fileService.getFileById(id);
    const hlsUrl = fileService.getHlsUrl(file.path);

    if (!hlsUrl) {
      throw new AppError(404, "HLS URL not found");
    }

    logger.info(`HLS URL retrieved successfully for file: ${file.name}`);
    res.status(200).json({
      status: "success",
      data: { hlsUrl },
    });
  } catch (error) {
    logger.error(`Error retrieving HLS URL: ${error.message}`);
    next(error);
  }
};

exports.getUserFiles = async (req, res, next) => {
  try {
    const files = await fileService.getFilesForUser(req.userId);

    logger.info(`Files retrieved successfully for user: ${req.userId}`);
    res.status(200).json({
      status: "success",
      data: { files },
    });
  } catch (error) {
    logger.error(`Error retrieving user files: ${error.message}`);
    next(error);
  }
};

exports.deleteFile = async (req, res, next) => {
  try {
    const { fileId } = req.query;
    await fileService.deleteFile(fileId);

    logger.info(`File deleted successfully: ${fileId}`);
    res.status(200).json({
      status: "success",
      message: "File deleted successfully",
    });
  } catch (error) {
    logger.error(`Error deleting file: ${error.message}`);
    next(error);
  }
};

exports.addFile = async (req, res, next) => {
  try {
    const { fileName, size, type } = req.body;
    const sanitizedFileName = fileName.replace(/ /g, "");
    const filePath = `${req.userId}/${sanitizedFileName}`;

    const file = await fileService.addFile(
      {
        name: sanitizedFileName,
        path: filePath,
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
