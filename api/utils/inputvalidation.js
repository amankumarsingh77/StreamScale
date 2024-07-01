const Joi = require("joi");

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  fullname: Joi.string().required(),
  password: Joi.string().min(6).required(),
  email: Joi.string().email().required(),
  message: Joi.string().optional().required(),
});

const loginSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(6).required(),
});

const addFileSchema = Joi.object({
  fileName: Joi.string().required(),
  size: Joi.number().required(),
  type: Joi.string().required(),
});

const updateUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  fullname: Joi.string().required(),
  picture: Joi.string(),
  message: Joi.string().min(20).required(),
});
module.exports = {
  registerSchema,
  loginSchema,
  addFileSchema,
  updateUserSchema,
};
