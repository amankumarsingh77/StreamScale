const dotenv = require("dotenv");
const Joi = require("joi");

dotenv.config();

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string()
      .valid("production", "development", "test")
      .required(),
    PORT: Joi.number().default(3002),
    MONGO_URI: Joi.string().required().description("MongoDB connection string"),
    JWT_SECRET: Joi.string().required().description("JWT secret key"),
    AWS_REGION: Joi.string().required(),
    AWS_ACCESS_KEY_ID: Joi.string().required(),
    AWS_SECRET_ACCESS_KEY: Joi.string().required(),
    AWS_S3_BUCKET: Joi.string().required(),
    AWS_SUBNET1: Joi.string().required(),
    AWS_SUBNET2: Joi.string().required(),
    AWS_SUBNET3: Joi.string().required(),
    AWS_SECURITY_GROUP: Joi.string().required(),
    AWS_CLUSTER_ARN: Joi.string().required(),
    AWS_TASK_ARN: Joi.string().required(),
    AWS_QUEUE_URL: Joi.string().required(),
    R2_REGION: Joi.string().required(),
    R2_ENDPOINT: Joi.string().required(),
    R2_ACCESS_KEY_ID: Joi.string().required(),
    R2_SECRET_ACCESS_KEY: Joi.string().required(),
    R2_BUCKET: Joi.string().required(),
    UPSTASH_REDIS_URL: Joi.string().required(),
    UPSTASH_REDIS_TOKEN: Joi.string().required(),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: "key" } })
  .validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongoose: {
    url: envVars.MONGO_URI,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
  },
  aws: {
    region: envVars.AWS_REGION,
    accessKeyId: envVars.AWS_ACCESS_KEY_ID,
    secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
    s3Bucket: envVars.AWS_S3_BUCKET,
    clusterArn: envVars.AWS_CLUSTER_ARN,
    taskArn: envVars.AWS_TASK_ARN,
    subnets: [envVars.AWS_SUBNET1, envVars.AWS_SUBNET2, envVars.AWS_SUBNET3],
    securityGroups: [envVars.AWS_SECURITY_GROUP],
    queueUrl: envVars.AWS_QUEUE_URL,
  },
  r2: {
    region: envVars.R2_REGION,
    endpoint: envVars.R2_ENDPOINT,
    accessKeyId: envVars.R2_ACCESS_KEY_ID,
    secretAccessKey: envVars.R2_SECRET_ACCESS_KEY,
    bucket: envVars.R2_BUCKET,
    cdnEndpoint: envVars.R2_CDN_ENDPOINT,
  },
  redis: {
    url: envVars.UPSTASH_REDIS_URL,
    token: envVars.UPSTASH_REDIS_TOKEN,
  },
};
