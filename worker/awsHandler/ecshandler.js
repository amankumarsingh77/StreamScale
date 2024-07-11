const { FileStatus } = require("../utils/constants");
const { getRunningTasks, getQueuedTasks } = require("../utils/redis");
const { ecs } = require("./config");
const {
  clusterArn,
  taskArn,
  subnetId,
  securityGroupId,
} = require("./constants");
const { deleteS3Video } = require("./s3handler");
const { deleteSQSMessage } = require("./sqshandler");
const {
  incrementRunningTasks,
  decrementRunningTasks,
} = require("./taskManager");
const { sendWebhookNotification } = require("./webhook");
const maxRunningTasks = require("./constants").maxRunningTasks;

const CHECK_INTERVAL = 5000;

const startECSTask = async (s3Bucket, s3Key, receiptHandle) => {
  try {
    await incrementRunningTasks();
    const params = createEcsParams(s3Bucket, s3Key);
    console.log(s3Key, "Transcoding video");
    await sendWebhookNotification(FileStatus.TRANSCODING, s3Key);
    const data = await ecs.runTask(params).promise();
    await deleteSQSMessage(receiptHandle);
    const currentTaskArn = data.tasks[0].taskArn;

    monitorTaskStatus(currentTaskArn, s3Bucket, s3Key);
  } catch (err) {
    console.error("Error starting ECS task:", err);
    await decrementRunningTasks();
    await checkAndStartNextTask();
  }
};

const checkAndStartNextTask = async () => {
  const runningTasks = await getRunningTasks();
  if (runningTasks >= maxRunningTasks) return;
  const nextTask = await getQueuedTasks();
  if (nextTask) {
    const { s3Bucket, s3Key, receiptHandle } = nextTask;
    await startECSTask(s3Bucket, s3Key, receiptHandle);
  }
};

const createEcsParams = (s3Bucket, s3Key) => ({
  cluster: clusterArn,
  taskDefinition: taskArn,
  count: 1,
  launchType: "FARGATE",
  networkConfiguration: {
    awsvpcConfiguration: {
      subnets: subnetId,
      securityGroups: [securityGroupId],
      assignPublicIp: "ENABLED",
    },
  },
  overrides: {
    containerOverrides: [
      {
        name: process.env.ECS_CONTAINER_NAME,
        environment: [
          { name: "AWS_REGION", value: process.env.AWS_REGION },
          { name: "AWS_ACCESS_KEY_ID", value: process.env.AWS_ACCESS_KEY_ID },
          {
            name: "AWS_SECRET_ACCESS_KEY",
            value: process.env.AWS_SECRET_ACCESS_KEY,
          },
          { name: "S3_BUCKET", value: s3Bucket },
          { name: "S3_KEY", value: s3Key },
          { name: "R2_BUCKET", value: process.env.R2_BUCKET },
          { name: "R2_ACCESS_KEY_ID", value: process.env.R2_ACCESS_KEY_ID },
          {
            name: "R2_SECRET_ACCESS_KEY",
            value: process.env.R2_SECRET_ACCESS_KEY,
          },
          { name: "R2_ENDPOINT", value: process.env.R2_ENDPOINT },
        ],
      },
    ],
  },
});

const monitorTaskStatus = async (taskArn, s3Bucket, s3Key) => {
  const params = { cluster: clusterArn, tasks: [taskArn] };

  const handleTaskCompletion = async (status) => {
    try {
      await decrementRunningTasks();
      await sendWebhookNotification(status, s3Key);

      if (status === FileStatus.DONE) {
        await deleteS3Video(s3Bucket, s3Key);
        console.log("ECS task completed successfully:", taskArn);
      } else {
        console.error("ECS task failed:", taskArn);
      }

      await checkAndStartNextTask();
    } catch (err) {
      console.error("Error handling task completion:", err);
    }
  };

  const checkTaskStatus = async () => {
    try {
      const data = await ecs.describeTasks(params).promise();
      const task = data.tasks[0];

      if (task.lastStatus === "STOPPED") {
        const status =
          task.containers[0].exitCode === 0
            ? FileStatus.DONE
            : FileStatus.FAILED;
        console.log("ECS task stopped with status:", status);
        await handleTaskCompletion(status);
      } else {
        setTimeout(checkTaskStatus, CHECK_INTERVAL);
      }
    } catch (err) {
      console.error("Error monitoring ECS task status:", err);
      setTimeout(checkTaskStatus, CHECK_INTERVAL);
    }
  };

  checkTaskStatus();
};

module.exports = {
  startECSTask,
  monitorTaskStatus,
};
