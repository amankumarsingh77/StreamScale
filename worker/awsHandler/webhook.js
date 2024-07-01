const axios = require("axios");

// TODO: figure out a better way to update the status
const sendWebhookNotification = async (status, key) => {
  const webhookUrl = "http://localhost:3002/api/webhook/updatestatus";
  try {
    await axios.post(webhookUrl, { status, key });
    console.log("Webhook notification sent successfully");
  } catch (error) {
    console.error("Error sending webhook notification:", error);
  }
};

module.exports = {
  sendWebhookNotification,
};
