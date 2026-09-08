/**
 * Express controller handling incoming HTTP requests for authentication endpoints.
 */
const authService = require('../services/auth.service');
const { registerSchema, loginSchema, refreshTokenSchema } = require('../middlewares/auth.validation');
const { createSuccessResponse, ValidationError } = require('shared-lib');

class HttpController {

  async register(req, res) {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const user = await authService.register(value);
    res.status(201).json(createSuccessResponse(user));
  }

  async login(req, res) {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const result = await authService.login(value.email, value.password);
    res.status(200).json(createSuccessResponse(result));
  }

  async refreshToken(req, res) {
    const { error, value } = refreshTokenSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const result = await authService.refreshToken(value.refreshToken);
    res.status(200).json(createSuccessResponse(result));
  }
}

module.exports = new HttpController();
