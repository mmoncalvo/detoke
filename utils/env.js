const { z } = require('zod');
require('dotenv').config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters'),
  DB_DIALECT: z.enum(['sqlite', 'mysql']).default('sqlite'),
  DB_STORAGE: z.string().default('database.sqlite'),
  DB_HOST: z.string().optional(),
  DB_PORT: z.string().optional(),
  DB_NAME: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASS: z.string().optional(),
  SEED_DB: z.enum(['true', 'false']).default('false')
});

const env = envSchema.parse(process.env);
module.exports = env;
