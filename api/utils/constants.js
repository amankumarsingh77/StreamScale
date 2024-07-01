const dotenv = require("dotenv");
dotenv.config();

const clusterArn =process.env.AWS_CLUSTER_ARN;
const taskArn =process.env.AWS_TASK_ARN;
const queueUrl =process.env.AWS_QUEUE_URL;
const subnetId = [process.env.SUBNET1,process.env.SUBNET2,process.env.SUBNET3];
const securityGroupId = process.env.SECURITY_GROUP_ID;
const max_running_tasks = process.env.MAX_RUNNING_TASKS;
const redisUrl = process.env.UPSTASH_REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_TOKEN;
const r2BucketName = process.env.R2_BUCKET;

module.exports={clusterArn, taskArn, queueUrl, subnetId, securityGroupId, max_running_tasks, redisUrl, redisToken, r2BucketName};
