const { queueUrl, max_running_tasks } = require("./awsHandler/constants");
const { startECSTask } = require("./awsHandler/ecshandler");
const { setQueueTask, getRunningTasks } = require("./utils/redis");
const { deleteSQSMessage } = require("./awsHandler/sqshandler");
const { sqs } = require("./awsHandler/config");

const pollQueue = async () => {
  try {
    const params = { QueueUrl: queueUrl, MaxNumberOfMessages: 10 };
    const data = await sqs.receiveMessage(params).promise();

    if (data.Messages) {
      for (const message of data.Messages) {
        const s3Event = JSON.parse(message.Body);
        await deleteSQSMessage(message.ReceiptHandle);
        const s3Bucket = s3Event.Records[0].s3.bucket.name;
        const s3Key = s3Event.Records[0].s3.object.key;
        const runningTasks = await getRunningTasks();
        if (runningTasks < max_running_tasks) {
          await startECSTask(s3Bucket, s3Key, message.ReceiptHandle);
        } else {
          await setQueueTask(s3Bucket, s3Key, message.ReceiptHandle);
        }
      }
    }
  } catch (err) {
    console.error("Error:", err);
  }
  setTimeout(pollQueue, 5000);
};

pollQueue();
