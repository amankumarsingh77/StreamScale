const path = require("path");
const File = require("../models/file");
const User = require("../models/user");
const { AppError } = require("../utils/errorHandler");
const { deleteR2Directory } = require("./r2");
const { r2 } = require("../config/env");

const addFile = async (fileData, userId) => {
  const file = new File({
    ...fileData,
    user: userId,
    status: "QUEUED",
  });
  await file.save();
  await User.findByIdAndUpdate(userId, { $push: { files: file._id } });
  return file;
};

const getFileById = async (fileId) => {
  const file = await File.findById(fileId);
  if (!file) {
    throw new AppError(404, "File not found");
  }
  return file;
};

const getFileByPath = async (filePath) => {
  const file = await File.findOne({ path: filePath });
  if (!file) {
    throw new AppError(404, "File not found");
  }
  return file;
};

const updateFile = async (fileId, fileData) => {
  const file = await File.findByIdAndUpdate(
    fileId,
    { ...fileData },
    { new: true, runValidators: true }
  );
  if (!file) {
    throw new AppError(404, "File not found");
  }
  return file;
};

const updateFileStatus = async (fileId, status) => {
  const file = await File.findByIdAndUpdate(fileId, { status }, { new: true });
  if (!file) {
    throw new AppError(404, "File not found");
  }
  return file;
};

const deleteFile = async (fileId) => {
  const file = await File.findByIdAndDelete(fileId);
  if (!file) {
    throw new AppError(404, "File not found");
  }
  await User.updateOne({ _id: file.user }, { $pull: { files: fileId } });
  await deleteR2Directory(file.path);
};

const getFilesForUser = async (userId, page = 1, limit = 10) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  const skip = (page - 1) * limit;

  const files = await File.find({ _id: { $in: user.files } })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalFiles = await File.countDocuments({ _id: { $in: user.files } });
  const totalPages = Math.ceil(totalFiles / limit);

  return {
    files,
    currentPage: page,
    totalPages,
    totalFiles,
  };
};

const getHlsUrl = (key) => {
  const dir = path.dirname(key);
  const base = path.basename(key, path.extname(key));
  const pathDir = path.join(dir, base).replace(/\\/g, "/");
  return `${r2.cdnEndpoint}/${pathDir}/master.m3u8`;
};

module.exports = {
  addFile,
  getFileById,
  getFileByPath,
  updateFileStatus,
  deleteFile,
  getFilesForUser,
  updateFile,
  getHlsUrl,
};
