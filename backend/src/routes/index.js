import { Router } from 'express';
import eventsRouter from './events.js';
import registrationsRouter from './registrations.js';
import authRouter from './auth.js';
import adminRouter from './admin.js';
import { formatSuccess } from '../utils/helpers.js';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json(formatSuccess({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  }));
});

// API Info endpoint
router.get('/', (req, res) => {
  res.json(formatSuccess({
    name: 'Event Registration API',
    version: '1.0.0',
    description: 'Production-ready backend for Event Registration app',
    endpoints: {
      events: '/api/events',
      registrations: '/api/registrations',
      auth: '/api/auth',
      admin: '/api/admin'
    },
    documentation: '/api/docs',
    health: '/api/health'
  }));
});

// Mount route modules
// Mount admin routes first to avoid conflicts with parameterized routes
router.use('/admin', adminRouter);
router.use('/auth', authRouter);
router.use('/events', eventsRouter);
router.use('/', registrationsRouter); // Registration routes are nested under events

export default router;
