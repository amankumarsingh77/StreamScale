const fileService = require("../services/fileService");
const logger = require("../utils/logger");
const { AppError } = require("../utils/errorHandler");

exports.updateFileStatus = async (req, res, next) => {
  try {
    const { key, status } = req.body;

    if (!key || !status) {
      throw new AppError(400, "Both key and status are required");
    }

    const file = await fileService.getFileByPath(key);
    await fileService.updateFileStatus(file._id, status);

    logger.info(
      `File status updated successfully: ${file.name}, Status: ${status}`
    );
    res.status(200).json({
      status: "success",
      message: "File status updated successfully",
    });
  } catch (error) {
    logger.error(`Error updating file status: ${error.message}`);
    next(error);
  }
};
