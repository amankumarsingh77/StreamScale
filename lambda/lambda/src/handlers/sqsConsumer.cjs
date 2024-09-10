const AWS = require("aws-sdk");
const axios = require("axios");
const ecs = new AWS.ECS();
const sqs = new AWS.SQS();

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  let messagesProcessed = 0;
  const processedMessages = new Set();

  while (messagesProcessed < event.Records.length) {
    const record = event.Records[messagesProcessed];
    const { s3Bucket, s3Key } = JSON.parse(record.body);
    const messageId = `${s3Bucket}-${s3Key}`;

    if (processedMessages.has(messageId)) {
      console.log(`Skipping duplicate message: ${messageId}`);
      messagesProcessed++;
      continue;
    }

    try {
      await startEcsTask(s3Bucket, s3Key);
      processedMessages.add(messageId);
      console.log(`Processed message: ${messageId}`);
    } catch (error) {
      console.error(
        `Error processing message for ${s3Bucket}/${s3Key}:`,
        error
      );
    }

    messagesProcessed++;
  }

  // let hasMoreMessages = true;
  // while (hasMoreMessages) {
  //   hasMoreMessages = await checkPendingTasks();
  // }

  console.log(`Total messages processed: ${messagesProcessed}`);
  return { statusCode: 200, body: "Processing complete" };
};

async function startEcsTask(s3Bucket, s3Key) {
  const taskId = Date.now().toString();

  const result = await ecs
    .runTask({
      cluster: process.env.ECS_CLUSTER_ARN,
      taskDefinition: process.env.ECS_TASK_DEFINITION_ARN,
      launchType: "FARGATE",
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: process.env.SUBNET_IDS.split(","),
          securityGroups: [process.env.SECURITY_GROUP_ID],
          assignPublicIp: "ENABLED",
        },
      },
      overrides: {
        containerOverrides: [
          {
            name: process.env.ECS_CONTAINER_NAME,
            environment: [
              { name: "AWS_REGION", value: process.env.AWS_REGION },
              { name: "S3_BUCKET", value: s3Bucket },
              { name: "S3_KEY", value: s3Key },
              { name: "R2_BUCKET", value: process.env.R2_BUCKET },
              { name: "R2_ACCESS_KEY_ID", value: process.env.R2_ACCESS_KEY_ID },
              {
                name: "R2_SECRET_ACCESS_KEY",
                value: process.env.R2_SECRET_ACCESS_KEY,
              },
              { name: "R2_ENDPOINT", value: process.env.R2_ENDPOINT },
              { name: "SNS_TOPIC_ARN", value: process.env.SNS_TOPIC_ARN },
              { name: "TASK_ID", value: taskId },
              { name: "R2_CDN_ENDPOINT", value: process.env.R2_CDN_ENDPOINT },
            ],
          },
        ],
      },
    })
    .promise();

  const taskArn = result.tasks[0].taskArn;
  await updateStatus(s3Key, "RUNNING");
  console.log("ECS task started:", taskArn);
}

async function updateStatus(path, value) {
  const data = JSON.stringify({
    collection: "files",
    database: "video-transcoder",
    dataSource: "Cluster0",
    filter: { path: path },
    update: {
      $set: {
        status: value,
      },
    },
  });

  const config = {
    method: "post",
    url: "https://ap-south-1.aws.data.mongodb-api.com/app/data-xuasubh/endpoint/data/v1/action/updateOne",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Request-Headers": "*",
      "api-key": process.env.MONGO_API_KEY,
    },
    data: data,
  };

  try {
    const response = await axios(config);
    console.log("Update Response:", response.data);
  } catch (error) {
    console.error("Error updating document:", error.response.data);
  }
}

async function checkPendingTasks() {
  const pendingMessages = await sqs
    .receiveMessage({
      QueueUrl: process.env.SQS_QUEUE_URL,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 0,
    })
    .promise();

  if (pendingMessages.Messages && pendingMessages.Messages.length > 0) {
    for (const message of pendingMessages.Messages) {
      const { s3Bucket, s3Key } = JSON.parse(message.Body);

      try {
        await startEcsTask(s3Bucket, s3Key);

        await sqs
          .deleteMessage({
            QueueUrl: process.env.SQS_QUEUE_URL,
            ReceiptHandle: message.ReceiptHandle,
          })
          .promise();

        console.log(`Processed pending task for ${s3Bucket}/${s3Key}`);
      } catch (error) {
        console.error(
          `Error processing pending task for ${s3Bucket}/${s3Key}:`,
          error
        );
      }
    }
    return true;
  }

  return false;
}

// const AWS = require("aws-sdk");
// const axios = require("axios");
// const ecs = new AWS.ECS();
// const sqs = new AWS.SQS();

// exports.handler = async (event) => {
//   console.log("Received event:", JSON.stringify(event, null, 2));

//   let messagesProcessed = 0;
//   const processedMessages = new Set();

//   while (messagesProcessed < event.Records.length) {
//     const record = event.Records[messagesProcessed];
//     const { s3Bucket, s3Key } = JSON.parse(record.body);
//     const messageId = `${s3Bucket}-${s3Key}`;

//     if (processedMessages.has(messageId)) {
//       console.log(`Skipping duplicate message: ${messageId}`);
//       messagesProcessed++;
//       continue;
//     }

//     try {
//       await startEcsTask(s3Bucket, s3Key);
//       processedMessages.add(messageId);
//       console.log(`Processed message: ${messageId}`);
//     } catch (error) {
//       console.error(
//         `Error processing message for ${s3Bucket}/${s3Key}:`,
//         error
//       );
//     }

//     messagesProcessed++;
//   }

//   // let hasMoreMessages = true;
//   // while (hasMoreMessages) {
//   //   hasMoreMessages = await checkPendingTasks();
//   // }

//   console.log(`Total messages processed: ${messagesProcessed}`);
//   return { statusCode: 200, body: "Processing complete" };
// };

// async function startEcsTask(s3Bucket, s3Key) {
//   const taskId = Date.now().toString();

//   const result = await ecs
//     .runTask({
//       cluster: process.env.ECS_CLUSTER_ARN,
//       taskDefinition: process.env.ECS_TASK_DEFINITION_ARN,
//       launchType: "EC2",
//       overrides: {
//         containerOverrides: [
//           {
//             name: process.env.ECS_CONTAINER_NAME,
//             environment: [
//               { name: "AWS_REGION", value: process.env.AWS_REGION },
//               { name: "S3_BUCKET", value: s3Bucket },
//               { name: "S3_KEY", value: s3Key },
//               { name: "R2_BUCKET", value: process.env.R2_BUCKET },
//               { name: "R2_ACCESS_KEY_ID", value: process.env.R2_ACCESS_KEY_ID },
//               {
//                 name: "R2_SECRET_ACCESS_KEY",
//                 value: process.env.R2_SECRET_ACCESS_KEY,
//               },
//               { name: "R2_ENDPOINT", value: process.env.R2_ENDPOINT },
//               { name: "SNS_TOPIC_ARN", value: process.env.SNS_TOPIC_ARN },
//               { name: "TASK_ID", value: taskId },
//               { name: "R2_CDN_ENDPOINT", value: process.env.R2_CDN_ENDPOINT },
//             ],
//           },
//         ],
//       },
//     })
//     .promise();

//   const taskArn = result.tasks[0].taskArn;
//   await updateStatus(s3Key, "TRANSCODING");
//   console.log("ECS task started:", taskArn);
// }

// async function updateStatus(path, value) {
//   const data = JSON.stringify({
//     collection: "files",
//     database: "video-transcoder",
//     dataSource: "Cluster0",
//     filter: { path: path },
//     update: {
//       $set: {
//         status: value,
//       },
//     },
//   });

//   const config = {
//     method: "post",
//     url: "https://ap-south-1.aws.data.mongodb-api.com/app/data-xuasubh/endpoint/data/v1/action/updateOne",
//     headers: {
//       "Content-Type": "application/json",
//       "Access-Control-Request-Headers": "*",
//       "api-key": process.env.MONGO_API_KEY,
//     },
//     data: data,
//   };

//   try {
//     const response = await axios(config);
//     console.log("Update Response:", response.data);
//   } catch (error) {
//     console.error("Error updating document:", error.response.data);
//   }
// }

// async function checkPendingTasks() {
//   const pendingMessages = await sqs
//     .receiveMessage({
//       QueueUrl: process.env.SQS_QUEUE_URL,
//       MaxNumberOfMessages: 10,
//       WaitTimeSeconds: 0,
//     })
//     .promise();

//   if (pendingMessages.Messages && pendingMessages.Messages.length > 0) {
//     for (const message of pendingMessages.Messages) {
//       const { s3Bucket, s3Key } = JSON.parse(message.Body);

//       try {
//         await startEcsTask(s3Bucket, s3Key);

//         await sqs
//           .deleteMessage({
//             QueueUrl: process.env.SQS_QUEUE_URL,
//             ReceiptHandle: message.ReceiptHandle,
//           })
//           .promise();

//         console.log(`Processed pending task for ${s3Bucket}/${s3Key}`);
//       } catch (error) {
//         console.error(
//           `Error processing pending task for ${s3Bucket}/${s3Key}:`,
//           error
//         );
//       }
//     }
//     return true;
//   }

//   return false;
// }
