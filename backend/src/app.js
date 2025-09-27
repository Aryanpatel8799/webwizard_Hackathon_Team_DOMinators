import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { createServer } from 'http';

// Import configurations and utilities
import config from './config/index.js';
import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import logger from './utils/logger.js';

// Import middleware
import { 
  errorHandler, 
  notFound, 
  apiLimiter 
} from './middleware/index.js';

// Import routes
import apiRoutes from './routes/index.js';

// Import services
import { initializeSocket, SocketEmitters } from './services/socketService.js';
import { jobManager } from './jobs/index.js';

/**
 * Create and configure Express application
 */
const createApp = () => {
  const app = express();

  // Trust proxy (for accurate IP addresses behind reverse proxies)
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false
  }));

  // CORS configuration
  const corsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        process.env.FRONTEND_URL
      ].filter(Boolean);

      if (allowedOrigins.includes(origin) || config.nodeEnv === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  };

  app.use(cors(corsOptions));

  // Logging middleware
  const loggerFormat = config.nodeEnv === 'production' 
    ? 'combined' 
    : ':method :url :status :res[content-length] - :response-time ms';

  app.use(morgan(loggerFormat, {
    stream: {
      write: (message) => logger.info(message.trim())
    },
    skip: (req, res) => {
      // Skip logging for health checks in production
      return config.nodeEnv === 'production' && req.url === '/api/health';
    }
  }));

  // Body parsing middleware
  app.use(express.json({ 
    limit: '10mb',
    strict: true
  }));

  app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb' 
  }));

  // Rate limiting (apply to all routes)
  app.use(apiLimiter);

  // Request ID middleware for tracking
  app.use((req, res, next) => {
    req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Request-ID', req.requestId);
    next();
  });

  // Request logging middleware
  app.use((req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      if (req.url !== '/api/health') {
        logger.info('HTTP Request', {
          requestId: req.requestId,
          method: req.method,
          url: req.originalUrl,
          status: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          contentLength: res.get('content-length') || 0
        });
      }
    });
    
    next();
  });

  // Mount API routes
  app.use('/api', apiRoutes);

  // Serve static files for uploads (with authentication for sensitive files)
  app.use('/uploads', express.static('uploads', {
    maxAge: config.nodeEnv === 'production' ? '1d' : '0'
  }));

  // Basic route for root
  app.get('/', (req, res) => {
    res.json({
      name: 'Event Registration API',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      endpoints: {
        api: '/api',
        health: '/api/health',
        docs: '/api/docs'
      }
    });
  });

  // Handle 404 errors
  app.use(notFound);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
};

/**
 * Initialize application with all services
 */
const initializeApp = async () => {
  try {
    logger.info('Initializing application...');

    // Connect to databases
    logger.info('Connecting to databases...');
    await connectDatabase();
    
    logger.info('Connecting to Redis...');
    await connectRedis();

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.IO
    logger.info('Initializing WebSocket server...');
    const io = initializeSocket(httpServer);
    const socketEmitters = new SocketEmitters(io);

    // Make Socket.IO available to routes
    app.set('io', io);
    app.set('socketEmitters', socketEmitters);

    // Add Socket.IO to request object for controllers
    app.use((req, res, next) => {
      req.io = io;
      req.socketEmitters = socketEmitters;
      next();
    });

    // Start background jobs
    if (config.nodeEnv !== 'test') {
      logger.info('Starting background job scheduler...');
      jobManager.start();
    }

    logger.info('Application initialized successfully');

    return { app, httpServer, io, socketEmitters };
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    process.exit(1);
  }
};

export { createApp, initializeApp };
export default { createApp, initializeApp };
