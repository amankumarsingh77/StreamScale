const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
    unique: true,
  },
  fullname: {
    type: String,
    required: [true, "Fullname is required"],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
  },
  picture: {
    type: String,
    default: "",
  },
  isAllowed: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
    required: [true, "Message is required"],
  },
  files: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
    },
  ],
});

const User = mongoose.model("User", userSchema);

module.exports = { User };
