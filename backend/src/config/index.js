import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root directory
dotenv.config();

export default {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/eventreg',
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecret_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  email: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY
    },
    from: process.env.EMAIL_FROM || 'Event Team <no-reply@example.com>'
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 1000 || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 20
  },
  seatHold: {
    seconds: parseInt(process.env.SEAT_HOLD_SECONDS) || 120
  },
  baseUrl: process.env.BASE_URL || 'http://localhost:4000',
  nodeEnv: process.env.NODE_ENV || 'development',
  recaptcha: {
    secretKey: process.env.RECAPTCHA_SECRET_KEY
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB
  },
  db: {
    options: {
      maxPoolSize: parseInt(process.env.DB_OPTIONS_MAX_POOL_SIZE) || 10,
      serverSelectionTimeoutMS: parseInt(process.env.DB_OPTIONS_SERVER_SELECTION_TIMEOUT) || 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000
    }
  }
};
