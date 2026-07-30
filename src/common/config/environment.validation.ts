import Joi from 'joi';

export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  APP_TIMEZONE: Joi.string()
    .trim()
    .custom((value: string, helpers) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: value }).format();

        return value;
      } catch {
        return helpers.error('any.invalid');
      }
    })
    .default('Asia/Shanghai'),
  APP_CORS_ORIGINS: Joi.string().trim().min(1).default('http://localhost:5173'),
  DATABASE_URL: Joi.string()
    .uri({
      scheme: ['postgres', 'postgresql'],
    })
    .required(),
  AI_PROVIDER: Joi.string().valid('deepseek', 'openai').default('deepseek'),
  DEEPSEEK_API_KEY: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().trim().min(1).required(),
    otherwise: Joi.string().trim().min(1).empty('').optional(),
  }),
  DEEPSEEK_MODEL: Joi.string().trim().min(1).default('deepseek-v4-flash'),
  OPENAI_API_KEY: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().trim().min(1).required(),
    otherwise: Joi.string().trim().min(1).empty('').optional(),
  }),
  OPENAI_MODEL: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().trim().min(1).required(),
    otherwise: Joi.string().trim().min(1).empty('').optional(),
  }),
});
