const { Requestform } = require("../models/requestform");

//not being used right now
const createRequestform = async (email, message) => {
  try {
    const requestform = new Requestform({ email, message });
    await requestform.save();
    return requestform;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

module.exports = { createRequestform };
