const Joi = require("joi");

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(6).required(),
  email: Joi.string().email().required(),
  message: Joi.string().optional(),
});

const loginSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(6).required(),
});

const AddFileSchema = Joi.object({
  fileName: Joi.string().required(),
  size: Joi.number().required(),
  type: Joi.string().required(),
});
module.exports = {
  registerSchema,
  loginSchema,
  AddFileSchema,
};
