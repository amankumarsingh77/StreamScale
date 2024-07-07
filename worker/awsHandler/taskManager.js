const {
  getRunningTasks,
  updateRunningTasks,
  getQueuedTasks,
} = require("../utils/redis");

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
  incrementRunningTasks,
  decrementRunningTasks,
};
