const express = require("express");
const cookieParser = require("cookie-parser");
const uploadRouter = require("./routes/upload");
const userRouter = require("./routes/user");
const cors = require("cors");
const mongoose = require("mongoose");
const webhookRouter = require("./routes/webhook");
const fileRouter = require("./routes/file");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(
  cors({
    credentials: true,
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://streamscale.aksdev.me",
    ],
  })
);
app.use(cookieParser());

app.use("/api/upload", uploadRouter);
app.use("/api/user", userRouter);
app.use("/api/webhook", webhookRouter);
app.use("/api/file", fileRouter);

mongoose.connect(process.env.MONGO_URI);

const port = 3002;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
