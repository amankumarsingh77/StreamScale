const { Redis } = require("@upstash/redis");
const { redisUrl, redisToken } = require("../awsHandler/constants");

const upstashRedis = new Redis({
  url: redisUrl,
  token: redisToken,
});

const updateRunningTasks = async (count) => {
  await upstashRedis.set("runningTasks", count);
};

const getRunningTasks = async () => {
  return await upstashRedis.get("runningTasks");
};

const updateStatus = async (key, value) => {
  await upstashRedis.set(key, value);
};

const getStatus = async (key) => {
  return await upstashRedis.get(key);
};

const deleteStatus = async (key) => {
  await upstashRedis.del(key);
};

const getQueuedTasks = async () => {
  return await upstashRedis.get("taskQueue");
};

const setQueueTask = async (s3Bucket, s3Key, receiptHandle) => {
  await upstashRedis.lpush(
    "taskQueue",
    JSON.stringify({
      s3Bucket,
      s3Key,
      receiptHandle,
    })
  );
  console.log("Task added to queue:", s3Key);
};

module.exports = {
  updateRunningTasks,
  getRunningTasks,
  updateStatus,
  getQueuedTasks,
  setQueueTask,
  getStatus,
  deleteStatus,
};
