const path = require("path");
const { File } = require("../models/file");
const { User } = require("../models/user");
const { deleteR2Directory } = require("./r2");

const sanitizePath = (filePath) => filePath.replace(/[^a-zA-Z0-9_ .\/-]/g, "");

const addFile = async (filename, filePath, size, type, userId, status) => {
  try {
    const file = new File({
      name: filename,
      size,
      type,
      status,
      user: userId,
      path: sanitizePath(filePath),
    });
    await file.save();
    await User.findByIdAndUpdate(userId, { $push: { files: file._id } });
    return file;
  } catch (error) {
    console.error("Error adding file:", error);
    throw new Error("Failed to add file");
  }
};

const getFileByPath = async (filePath) => {
  try {
    return await File.findOne({ path: filePath });
  } catch (error) {
    console.error("Error getting file by path:", error);
    throw new Error("Failed to get file by path");
  }
};

const getFile = async (fileId) => {
  try {
    return await File.findById(fileId);
  } catch (error) {
    console.error("Error getting file:", error);
    throw new Error("Failed to get file");
  }
};

const deleteFile = async (fileId) => {
  try {
    const file = await File.findOneAndDelete({ _id: fileId });
    if (!file) {
      throw new Error("File not found");
    }
    await User.updateOne({ _id: file.user }, { $pull: { files: fileId } });
    await deleteR2Directory(file.path);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("Failed to delete file");
  }
};

const updateFileStatusByPath = async (filePath, status) => {
  if (!filePath || !status) {
    throw new Error("Path or status is missing");
  }
  try {
    const file = await File.findOneAndUpdate(
      { path: filePath },
      { status },
      { new: true }
    );
    if (!file) {
      throw new Error("File not found");
    }
    return file;
  } catch (error) {
    console.error("Error updating file status by path:", error);
    throw new Error("Failed to update file status");
  }
};

const updateFileStatus = async (fileId, status) => {
  try {
    const file = await File.findByIdAndUpdate(
      fileId,
      { status },
      { new: true }
    );
    if (!file) {
      throw new Error("File not found");
    }
    return file;
  } catch (error) {
    console.error("Error updating file status:", error);
    throw new Error("Failed to update file status");
  }
};

const getFiles = async (userId) => {
  try {
    const user = await User.findById(userId).populate({
      path: "files",
      select: "name size type status createdAt",
    });
    if (!user) {
      throw new Error("User not found");
    }
    return user.files;
  } catch (error) {
    console.error("Error getting files:", error);
    throw new Error("Failed to get files");
  }
};

const getHlsUrl = async (key) => {
  try {
    const dir = path.dirname(key);
    const base = path.basename(key, path.extname(key));
    const pathDir = path.join(dir, base).replace(/\\/g, "/");
    const hlsUrl = `${process.env.CLOUDFLARE_PUBLIC_BASE_URL}/${pathDir}/master.m3u8`;
    return hlsUrl || null;
  } catch (error) {
    console.error("Error generating HLS URL:", error);
    throw new Error("Failed to generate HLS URL");
  }
};

module.exports = {
  addFile,
  getFiles,
  deleteFile,
  updateFileStatus,
  getFile,
  updateFileStatusByPath,
  getFileByPath,
  getHlsUrl,
};
