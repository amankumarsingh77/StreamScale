const { File } = require("../models/file");
const { User } = require("../models/user");
const { deleteR2Directory } = require("./r2");
const path = require("path");

const addFile = async (filename, path, size, type, userId, status) => {
  try {
    const file = new File({
      name: filename,
      size,
      type,
      status,
      user: userId,
      path: path.replace(/[^a-zA-Z0-9_ .\/-]/g, ""),
    });
    await file.save();
    await User.findByIdAndUpdate(userId, {
      $push: { files: file._id },
    });

    return file;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getFileByPath = async (path) => {
  try {
    const file = await File.findOne({ path: path });
    return file;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getFile = async (fileId) => {
  try {
    const file = await File.findById(fileId);
    return file;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const deleteFile = async (fileId) => {
  try {
    const file = await File.findOneAndDelete({ _id: fileId });
    await User.updateOne({ _id: file.user }, { $pull: { files: fileId } });
    deleteR2Directory(file.path);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const updateFileStatusByPath = async (path, status) => {
  if (!path || !status) {
    console.log("Path or status is missing");
    return;
  }
  const file = await File.findOne({ path });
  file.status = status;
  await file.save();
};

const updateFileStatus = async (fileId, status) => {
  try {
    const file = await File.findById(fileId);
    file.status = status;
    await file.save();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getFiles = async (userId) => {
  try {
    const user = await User.findById(userId).populate({
      path: "files",
      select: "name size type status createdAt",
    });
    return user.files;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getHlsUrl = async (key) => {
  try {
    const dir = path.dirname(key);
    const base = path.basename(key, path.extname(key));
    const pathdir = path.join(dir, base).replace(/\\/g, "/");
    const hlsurl = `${process.env.CLOUDFLARE_PUBLIC_BASE_URL}/${pathdir}/master.m3u8`;
    if (!hlsurl) null;
    return hlsurl;
  } catch (error) {
    console.error(error);
    throw error;
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
