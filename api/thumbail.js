const crypto = require("crypto");
const axios = require("axios");
const fs = require("fs");
const querystring = require("querystring");

// Configuration
const IMAGOR_SECRET = "mysecret"; // Replace with your actual secret
const IMAGOR_BASE_URL = "http://localhost:8000"; // Replace with your imagorvideo URL
const S3_BUCKET = "lambda-test-aman-demo"; // Replace with your S3 bucket name
const VIDEO_KEY = "youtube.mp4"; // Replace with an actual video path in your bucket

function generateImageorUrl(videoKey, width, height) {
  const operation = `video/thumbnail/0/height/${height}/width/${width}`;
  const urlSafeVideoKey = querystring.escape(`s3://${S3_BUCKET}/${videoKey}`);
  const unsignedUrl = `/${operation}/${urlSafeVideoKey}`;

  console.log("String being signed:", unsignedUrl);

  const hmac = crypto.createHmac("sha1", IMAGOR_SECRET);
  hmac.update(unsignedUrl);
  const signature = hmac
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  console.log("Generated signature:", signature);

  return `${IMAGOR_BASE_URL}/${signature}${unsignedUrl}`;
}

async function testImagorvideo() {
  try {
    const thumbnailUrl = generateImageorUrl(VIDEO_KEY, 320, 180);
    console.log("Generated Thumbnail URL:", thumbnailUrl);

    const response = await axios.get(thumbnailUrl);
    console.log("Response status:", response.status);
    console.log("Response headers:", response.headers);
  } catch (error) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

testImagorvideo();
