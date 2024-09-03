const path = require("path");

exports.validateFileName = (fileName) => {
  if (typeof fileName !== "string" || fileName.trim() === "") {
    return false;
  }

  if (fileName.length > 255) {
    return false;
  }

  const invalidChars = /[<>:"/\\|?*\x00-\x1F]/g;
  if (invalidChars.test(fileName)) {
    return false;
  }

  const allowedExtensions = [".mkv", ".mov", ".mp4", ".avi", ".flv", ".webm"];
  const ext = path.extname(fileName).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return false;
  }

  return true;
};

exports.validateFileMetadata = (fileName, size, type, uploadId) => {
  if (!this.validateFileName(fileName)) {
    return false;
  }

  if (typeof size !== "number" || size <= 0) {
    return false;
  }

  if (typeof type !== "string" || type.trim() === "") {
    return false;
  }

  if (typeof uploadId !== "string" || uploadId.trim() === "") {
    return false;
  }

  return true;
};
