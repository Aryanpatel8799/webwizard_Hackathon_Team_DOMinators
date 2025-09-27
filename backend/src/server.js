import { initializeApp } from './app.js';
import config from './config/index.js';
import logger from './utils/logger.js';

/**
 * Start the server
 */
const startServer = async () => {
  try {
    logger.info('🚀 Starting server initialization...');
    
    const { httpServer, io, socketEmitters } = await initializeApp();
    
    logger.info('✅ App initialization completed, starting HTTP server...');

    // Graceful shutdown handler
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      // Close HTTP server
      httpServer.close(() => {
        logger.info('HTTP server closed');
      });

      // Close Socket.IO server
      io.close(() => {
        logger.info('Socket.IO server closed');
      });

      // Stop background jobs
      try {
        const { jobManager } = await import('./jobs/index.js');
        jobManager.stop();
        logger.info('Background jobs stopped');
      } catch (error) {
        logger.warn('Error stopping background jobs:', error);
      }

      // Close database connections
      try {
        const mongoose = await import('mongoose');
        await mongoose.default.connection.close();
        logger.info('MongoDB connection closed');
      } catch (error) {
        logger.warn('Error closing MongoDB connection:', error);
      }

      // Close Redis connection
      try {
        const { redisClient } = await import('./config/redis.js');
        if (redisClient) {
          await redisClient.quit();
          logger.info('Redis connection closed');
        }
      } catch (error) {
        logger.warn('Error closing Redis connection:', error);
      }

      logger.info('Graceful shutdown completed');
      process.exit(0);
    };

    // Register shutdown handlers
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

    // Start listening
    const server = httpServer.listen(config.port, config.host, () => {
      logger.info(`🚀 Server started successfully!`);
      logger.info(`📍 Server running on: http://${config.host}:${config.port}`);
      logger.info(`🌍 Environment: ${config.nodeEnv}`);
      logger.info(`📊 MongoDB: ${config.mongoUri.replace(/:([^:@]{8})[^:@]*@/, ':$1***@')}`);
      logger.info(`🔄 Redis: ${config.redis.url}`);
      logger.info(`🔌 WebSocket server initialized`);
      logger.info(`⏰ Background jobs started`);
      
      if (config.nodeEnv === 'development') {
        logger.info(`\n🛠️  Development URLs:`);
        logger.info(`   API: http://localhost:${config.port}/api`);
        logger.info(`   Health: http://localhost:${config.port}/api/health`);
        logger.info(`   Admin: http://localhost:${config.port}/api/admin`);
        logger.info(`\n📝 Available commands:`);
        logger.info(`   npm run dev     - Start development server with hot reload`);
        logger.info(`   npm run prod    - Start production server`);
        logger.info(`   npm run test    - Run test suite`);
        logger.info(`   npm run seed    - Seed database with demo data`);
        logger.info(`   npm run logs    - Show application logs`);
      }
    });

    // Set server timeout (important for large file uploads)
    server.timeout = 5 * 60 * 1000; // 5 minutes
    server.keepAliveTimeout = 65 * 1000; // 65 seconds
    server.headersTimeout = 66 * 1000; // 66 seconds

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${config.port} is already in use`);
        process.exit(1);
      } else {
        logger.error('Server error:', error);
        process.exit(1);
      }
    });

    return { server, httpServer, io, socketEmitters };
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});

export { startServer };
export default startServer;
