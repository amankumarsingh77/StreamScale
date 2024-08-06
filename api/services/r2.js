const {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");
const dotenv = require("dotenv");
const path = require("path");
const { r2BucketName } = require("../utils/constants");

dotenv.config();

const s3Client = new S3Client({
  region: process.env.R2_REGION,
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function getFileDirectory(key) {
  try {
    const dir = path.dirname(key);
    const base = path.basename(key, path.extname(key));
    const pathdir = path.join(dir, base).replace(/\\/g, "/");
    return pathdir;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function deleteR2Directory(key) {
  try {
    const directoryPrefix = await getFileDirectory(key);
    const listCommand = new ListObjectsV2Command({
      Bucket: r2BucketName,
      Prefix: directoryPrefix,
    });
    const listedObjects = await s3Client.send(listCommand);
    if (!listedObjects.Contents) {
      return;
    }
    const fileKeys = listedObjects.Contents.map((file) => file.Key);
    const deleteParams = {
      Bucket: r2BucketName,
      Delete: {
        Objects: fileKeys.map((key) => ({ Key: key })),
      },
    };
    const command = new DeleteObjectsCommand(deleteParams);
    await s3Client.send(command);
  } catch (error) {
    console.error(error);
    throw error;
  }
}

module.exports = { deleteR2Directory };
