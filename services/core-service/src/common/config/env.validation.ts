import * as Joi from 'joi';

/**
 * Skema validasi environment. App gagal start lebih awal (fail-fast) bila ada
 * env wajib yang hilang/salah, bukan error misterius saat runtime.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),

  // Database
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  DB_SYNCHRONIZE: Joi.boolean().truthy('true').falsy('false').default(false),

  // Auth
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('900s'),
  JWT_REFRESH_SECRET: Joi.string().min(16).default(Joi.ref('JWT_SECRET')),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // AI service
  AI_SERVICE_URL: Joi.string().uri().required(),
  FACE_MATCH_THRESHOLD: Joi.number().min(0).max(2).default(0.4),
  LIVENESS_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),

  // MinIO
  MINIO_ENDPOINT: Joi.string().required(),
  MINIO_PORT: Joi.number().default(9000),
  MINIO_ACCESS_KEY: Joi.string().required(),
  MINIO_SECRET_KEY: Joi.string().required(),
  MINIO_BUCKET: Joi.string().default('biometric'),
  MINIO_USE_SSL: Joi.boolean().truthy('true').falsy('false').default(false),

  // Rate limit
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),

  // Seeder
  ADMIN_EMAIL: Joi.string().email().default('admin@geoface.com'),
  ADMIN_PASSWORD: Joi.string().default('Password123!'),
}).unknown(true);
