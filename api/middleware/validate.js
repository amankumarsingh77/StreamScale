const { AppError } = require("../utils/errorHandler");

const validate = (schema) => (req, res, next) => {
  const validationOptions = {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true,
  };
  console.log(req.body);

  const { error, value } = schema.validate(req.body, validationOptions);

  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(", ");
    throw new AppError(400, "Validation Error", errorMessage);
  }

  req.body = value;
  return next();
};

module.exports = validate;
