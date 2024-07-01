const { sqs } = require("./config");
const { queueUrl } = require("./constants");

const deleteSQSMessage = async (receiptHandle) => {
  const params = { QueueUrl: queueUrl, ReceiptHandle: receiptHandle };

  try {
    await sqs.deleteMessage(params).promise();
  } catch (error) {
    console.error("Error deleting message from SQS:", error);
  }
};

module.exports = { deleteSQSMessage };
