const AWS = require("aws-sdk");

const sqs = new AWS.SQS();
exports.handler = async (event) => {
  for (const record of event.Records) {
    const s3Event = record.s3;
    const s3Bucket = s3Event.bucket.name;
    const s3Key = decodeURIComponent(s3Event.object.key.replace(/\+/g, " "));

    try {
      const deduplicationId = `${s3Bucket}-${s3Key.replace(
        /[^a-zA-Z0-9_.-]/g,
        "_"
      )}-${Date.now()}`.slice(0, 128);
      await sqs
        .sendMessage({
          QueueUrl: process.env.SQS_QUEUE_URL,
          MessageBody: JSON.stringify({ s3Bucket, s3Key }),
          MessageGroupId: s3Bucket,
          MessageDeduplicationId: deduplicationId,
        })
        .promise();

      console.log(`Message sent to SQS for ${s3Bucket}/${s3Key}`);
    } catch (error) {
      console.error(
        `Error sending message to SQS for ${s3Bucket}/${s3Key}:`,
        error
      );
    }
  }

  return { statusCode: 200, body: "Processed successfully" };
};
