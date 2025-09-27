import { jest } from '@jest/globals';

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_only';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/event_registration_test';
  process.env.REDIS_HOST = 'localhost';
  process.env.REDIS_PORT = '6379';
  process.env.EMAIL_FROM = 'test@example.com';
});

// Global test teardown
afterAll(async () => {
  // Cleanup any global resources
  const mongoose = await import('mongoose');
  if (mongoose.default.connection.readyState !== 0) {
    await mongoose.default.connection.close();
  }
});

// Mock external services for tests
jest.mock('nodemailer', () => ({
  createTransport: () => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
  })
}));

jest.mock('redis', () => ({
  createClient: () => ({
    connect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    isReady: true,
    on: jest.fn()
  })
}));

// Increase timeout for integration tests
jest.setTimeout(30000);
