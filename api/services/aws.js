const { aws } = require("../config/env");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const uploadToS3 = async (file, key) => {
  const params = {
    Bucket: aws.s3Bucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (error) {
    throw new Error(`Error uploading file to S3: ${error.message}`);
  }
};

const deleteFromS3 = async (key) => {
  const params = {
    Bucket: aws.s3Bucket,
    Key: key,
  };

  try {
    await s3.deleteObject(params).promise();
  } catch (error) {
    throw new Error(`Error deleting file from S3: ${error.message}`);
  }
};

const generatePresignedUrl = async (path) => {
  const sanitizedPath = path.replace(/[^a-zA-Z0-9_.\/-]/g, "");

  try {
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: sanitizedPath,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return url;
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw new Error("Failed to generate presigned URL");
  }
};

// const sendSQSMessage = async (messageBody) => {
//   const params = {
//     QueueUrl: aws.queueUrl,
//     MessageBody: JSON.stringify(messageBody),
//   };

//   try {
//     await sqs.sendMessage(params).promise();
//   } catch (error) {
//     throw new Error(`Error sending message to SQS: ${error.message}`);
//   }
// };

// const startECSTask = async (containerOverrides) => {
//   const params = {
//     cluster: aws.clusterArn,
//     taskDefinition: aws.taskArn,
//     launchType: "FARGATE",
//     networkConfiguration: {
//       awsvpcConfiguration: {
//         subnets: [aws.subnets],
//         securityGroups: [aws.securityGroups],
//         assignPublicIp: "ENABLED",
//       },
//     },
//     overrides: {
//       containerOverrides: [containerOverrides],
//     },
//   };

//   try {
//     const result = await ecs.runTask(params).promise();
//     return result.tasks[0].taskArn;
//   } catch (error) {
//     throw new Error(`Error starting ECS task: ${error.message}`);
//   }
// };

module.exports = {
  uploadToS3,
  deleteFromS3,
  generatePresignedUrl,
};
