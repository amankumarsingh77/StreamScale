const { s3 } = require("./config");

const deleteS3Video = async (s3Bucket, s3Key) => {
  const params = { Bucket: s3Bucket, Key: s3Key };
  await s3.deleteObject(params).promise();
  console.log(`Deleted S3 object: ${s3Bucket}/${s3Key}`);
};



module.exports = {deleteS3Video}