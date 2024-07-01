const { getRunningTasks, updateRunningTasks, getQueuedTasks } = require('../utils/redis');
const { startECSTask } = require('./ecshandler');

const maxRunningTasks = require('./constants').maxRunningTasks;

const checkAndStartNextTask = async () => {
  const runningTasks = await getRunningTasks();
  if (runningTasks >= maxRunningTasks) return;

  const nextTask = await getQueuedTasks();
  if (nextTask) {
    const { s3Bucket, s3Key, receiptHandle } = nextTask;
    await startECSTask(s3Bucket, s3Key, receiptHandle);
  }
};

const incrementRunningTasks = async () => {
  let runningTasks = await getRunningTasks();
  runningTasks++;
  await updateRunningTasks(runningTasks);
};

const decrementRunningTasks = async () => {
  let runningTasks = await getRunningTasks();
  runningTasks--;
  await updateRunningTasks(runningTasks);
};

module.exports = {
  checkAndStartNextTask,
  incrementRunningTasks,
  decrementRunningTasks
};
