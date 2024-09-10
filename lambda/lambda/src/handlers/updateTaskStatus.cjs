const AWS = require("aws-sdk");
const { default: axios } = require("axios");
const ecs = new AWS.ECS();

exports.handler = async (event) => {
  try {
    const message = JSON.parse(event.Records[0].Sns.Message);
    const {
      status,
      videoKey,
      taskId,
      progress,
      duration,
      thumbnailUrl,
      videoCodec,
      audioCodec,
      resolution,
    } = message;
    console.log(
      `Video: ${videoKey}, Status: ${status}, Progress: ${progress}, Duration: ${duration}, videoCodec:${videoCodec}, audioCodec:${audioCodec}, resolution:${resolution}`
    );

    await updateDatabaseBasedOnStatus(
      videoKey,
      status,
      progress,
      duration,
      thumbnailUrl,
      videoCodec,
      audioCodec,
      resolution
    );
    if (status === "DONE" || status === "FAILED") {
      const isTaskStopped = await checkECSTaskStatus(taskId);

      if (isTaskStopped) {
        console.log(
          `Task ${taskId} completed with status ${status}. DynamoDB updated.`
        );
      } else {
        console.log(
          `Task ${taskId} completed with status ${status}, but ECS task is still running. DynamoDB not updated.`
        );
      }
    }
    return { statusCode: 200, body: "Status updated successfully" };
  } catch (error) {
    console.error("Error updating task status:", error);
    return { statusCode: 500, body: "Error updating task status" };
  }
};

const updateDatabaseBasedOnStatus = async (
  videoKey,
  status,
  progress,
  duration,
  thumbnailUrl,
  videoCodec,
  audioCodec,
  resolution
) => {
  let updateData = { status };

  if (status === "TRANSCODING") {
    updateData.progress = progress;
  } else if (status === "DONE") {
    updateData.progress = 100;
    updateData.duration = duration;
    updateData.videoCodec = videoCodec;
    updateData.audioCodec = audioCodec;
    updateData.resolution = resolution;
  } else if (status === "UPDATE_THUMBNAIL") {
    updateData.thumbnailUrl = thumbnailUrl;
  }

  await updateMongoDB(videoKey, updateData);
};

const updateMongoDB = async (path, updateData) => {
  try {
    const data = JSON.stringify({
      collection: "files",
      database: "video-transcoder",
      dataSource: "Cluster0",
      filter: { path: path },
      update: { $set: updateData },
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

    const response = await axios(config);
    console.log("MongoDB update response:", response.data);
  } catch (err) {
    console.error("Error updating MongoDB:", err);
    throw err;
  }
};

const checkECSTaskStatus = async (taskId) => {
  try {
    const params = {
      cluster: process.env.ECS_CLUSTER_ARN,
      tasks: [taskId],
    };

    const taskData = await ecs.describeTasks(params).promise();

    if (taskData.tasks.length > 0) {
      const taskStatus = taskData.tasks[0].lastStatus;
      return taskStatus === "STOPPED";
    } else {
      console.log(`Task ${taskId} not found in ECS cluster`);
      return true;
    }
  } catch (error) {
    console.error("Error checking ECS task status:", error);
    throw error;
  }
};
