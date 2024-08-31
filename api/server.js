const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const { errorHandler } = require("./utils/errorHandler");
const { port, mongoose: mongoConfig } = require("./config/env");
const uploadRouter = require("./routes/upload");
const userRouter = require("./routes/user");
const webhookRouter = require("./routes/webhook");
const fileRouter = require("./routes/file");

const app = express();

app.use(express.json());
app.use(
  cors({
    credentials: true,
    origin: [
      "http://localhost:5173",
      "http://localhost:3001",
      "http://localhost:3000",
      "https://streamscale.aksdev.me",
    ],
  })
);
app.use(cookieParser());

// Routes
app.use("/api/upload", uploadRouter);
app.use("/api/user", userRouter);
app.use("/api/webhook", webhookRouter);
app.use("/api/file", fileRouter);

// Error handling middleware
app.use(errorHandler);

// Database connection
mongoose
  .connect(mongoConfig.url)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app;
