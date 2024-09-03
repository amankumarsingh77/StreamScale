// src/models/File.js
const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "File name is required"],
    },
    url: {
      type: String,
    },
    size: {
      type: Number,
      required: [true, "File size is required"],
    },
    description: {
      type: String,
      default: null,
    },
    path: {
      type: String,
      required: [true, "File path is required"],
    },
    type: {
      type: String,
      required: [true, "File mimetype is required"],
    },
    status: {
      type: String,
      required: [true, "File status is required"],
      enum: ["queued", "transcoding", "done", "failed"],
    },
    uploadId: {
      type: String,
      required: [true, "UploadId is required"],
    },
    progress: {
      type: Number,
      default: 0,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    thumbnailUrl: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      default: null,
    },
    tags: {
      type: Array,
      default: null,
    },
    duration: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const File = mongoose.model("File", fileSchema);

module.exports = File;
