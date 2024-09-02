const AWS = require("aws-sdk");
const axios = require("axios");
const dynamodb = new AWS.DynamoDB.DocumentClient();
const ecs = new AWS.ECS();
const sqs = new AWS.SQS();

exports.handler = async (event) => {
  for (const record of event.Records) {
    const { s3Bucket, s3Key } = JSON.parse(record.body);

    try {
      const { canProceed } = await checkAndUpdateTaskCount();

      if (canProceed) {
        await startEcsTask(s3Bucket, s3Key);
      } else {
        await requeueMessage(record);
      }
    } catch (error) {
      console.error(
        `Error processing message for ${s3Bucket}/${s3Key}:`,
        error
      );
    }
  }
};

async function checkAndUpdateTaskCount() {
  const MAX_TASKS = parseInt(process.env.MAX_RUNNING_TASKS, 10);
  const TABLE_NAME = process.env.DYNAMODB_TABLE;

  if (!TABLE_NAME) {
    throw new Error("DYNAMODB_TABLE environment variable is not set");
  }

  try {
    const updateResult = await dynamodb
      .update({
        TableName: TABLE_NAME,
        Key: { id: "taskCounter" },
        UpdateExpression: "SET #count = if_not_exists(#count, :zero) + :inc",
        ExpressionAttributeNames: { "#count": "count" },
        ExpressionAttributeValues: { ":inc": 1, ":zero": 0 },
        ReturnValues: "UPDATED_NEW",
      })
      .promise();

    const currentCount = updateResult.Attributes.count;

    if (currentCount <= MAX_TASKS) {
      return { canProceed: true, count: currentCount };
    } else {
      // If we've exceeded MAX_TASKS, decrement the counter back
      await dynamodb
        .update({
          TableName: TABLE_NAME,
          Key: { id: "taskCounter" },
          UpdateExpression: "SET #count = #count - :dec",
          ExpressionAttributeNames: { "#count": "count" },
          ExpressionAttributeValues: { ":dec": 1 },
        })
        .promise();
      return { canProceed: false, count: currentCount - 1 };
    }
  } catch (error) {
    console.error("Error in checkAndUpdateTaskCount:", error);
    throw error;
  }
}

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

  // await dynamodb
  //   .put({
  //     TableName: process.env.DYNAMODB_TABLE,
  //     Item: {
  //       id: taskId,
  //       taskArn: taskArn,
  //       s3Bucket,
  //       s3Key,
  //       status: "RUNNING",
  //       startTime: new Date().toISOString(),
  //     },
  //   })
  //   .promise();
  await updateStatus(s3Key, "RUNNING");

  console.log("ECS task started:", taskArn);
}

async function updateStatus(path, value) {
  const API_KEY =
    "piS2hTx02vwurjpq93zYnYUcjPzvO3q25Lvnd0ycorXWdPXwwq1DrL6dzlRhJVUw";
  var data = JSON.stringify({
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

  var config = {
    method: "post",
    url: "https://ap-south-1.aws.data.mongodb-api.com/app/data-xuasubh/endpoint/data/v1/action/updateOne",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Request-Headers": "*",
      "api-key": API_KEY,
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

async function requeueMessage(record) {
  await sqs
    .sendMessage({
      QueueUrl: process.env.SQS_QUEUE_URL,
      MessageBody: record.body,
      MessageGroupId: JSON.parse(record.body).s3Bucket,
    })
    .promise();

  console.log(`Message requeued with delay: ${record.messageId}`);
}
