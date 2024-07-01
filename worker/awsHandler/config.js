const AWS = require("aws-sdk");
const dotenv = require('dotenv');
dotenv.config();

AWS.config.update({
  region: "ap-south-1",
});

const sqs = new AWS.SQS({ apiVersion: "2012-11-05" });
const ecs = new AWS.ECS({ apiVersion: "2014-11-13" });
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

module.exports = {
    sqs,ecs,s3
}