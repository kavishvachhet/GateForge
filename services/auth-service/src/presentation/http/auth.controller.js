const registerUseCase = require('../../application/use-cases/register.use-case');
const loginUseCase = require('../../application/use-cases/login.use-case');
const refreshTokenUseCase = require('../../application/use-cases/refresh-token.use-case');
const { registerSchema, loginSchema, refreshTokenSchema } = require('../../application/dtos/auth.validation');
const { createSuccessResponse, ValidationError } = require('shared-lib');

class AuthController {
  
  async register(req, res) {
    // 1. Validate request body
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // 2. Execute use case
    const user = await registerUseCase.execute(value);

    // 3. Send response
    res.status(201).json(createSuccessResponse(user));
  }

  async login(req, res) {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const result = await loginUseCase.execute(value.email, value.password);
    res.status(200).json(createSuccessResponse(result));
  }

  async refreshToken(req, res) {
    const { error, value } = refreshTokenSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const result = await refreshTokenUseCase.execute(value.refreshToken);
    res.status(200).json(createSuccessResponse(result));
  }
}

module.exports = new AuthController();
