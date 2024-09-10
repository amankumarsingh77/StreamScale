const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const keysSchema = new mongoose.Schema(
  {
    api_key: {
      type: String,
      default: uuidv4().replace(/-/g, ""),
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Keys = mongoose.model("Keys", keysSchema);

module.exports = Keys;
