const { Redis } = require("@upstash/redis");
const { redisUrl, redisToken } = require("../utils/constants");

const upstashRedis = new Redis({
  url: redisUrl,
  token: redisToken,
});

const updateStatus = async (key, value) => {
  await upstashRedis.set(key, value);
};

const getStatus = async (key) => {
  return await upstashRedis.get(key);
};

const deleteStatus = async (key) => {
  await upstashRedis.del(key);
};

module.exports = {
  updateStatus,
  getStatus,
  deleteStatus,
};
