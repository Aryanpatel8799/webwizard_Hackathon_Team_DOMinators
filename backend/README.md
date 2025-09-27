# Event Registration Backend API

A comprehensive, production-ready backend API for event registration and management built with Node.js, Express, MongoDB, and Socket.IO.

## 🚀 Features

### Core Functionality
- **Event Management**: Complete CRUD operations for events with advanced filtering
- **Registration System**: Attendee registration with validation and approval workflows  
- **Real-time Updates**: Socket.IO integration for live event updates and notifications
- **Admin Dashboard**: Role-based admin panel with comprehensive management tools
- **Waiting Lists**: Automatic seat management with auto-promotion from waiting lists
- **QR Code Tickets**: Automated QR code generation for event tickets

### Advanced Features
- **CSV Import/Export**: Bulk attendee management with validation
- **Email Notifications**: Automated email system with customizable templates
- **Seat Hold System**: Temporary seat reservations during registration
- **Background Jobs**: Automated tasks for maintenance and user experience
- **Audit Logging**: Comprehensive activity tracking for compliance
- **Rate Limiting**: Protection against abuse and spam
- **File Upload**: Secure handling of images and CSV files

### Technical Excellence
- **Production Ready**: Docker containerization with multi-environment support
- **Security First**: JWT authentication, input validation, and security headers
- **Performance**: Redis caching, database indexing, and optimized queries
- **Monitoring**: Structured logging with Winston and request tracking
- **Testing**: Comprehensive unit and integration test suite
- **Documentation**: Complete API documentation with examples

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+ with ES Modules
- **Framework**: Express.js with TypeScript-style JSDoc
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis for session storage and rate limiting
- **Real-time**: Socket.IO for WebSocket connections
- **Authentication**: JWT with bcrypt password hashing
- **Email**: Nodemailer with SendGrid/SMTP support
- **File Processing**: Multer for uploads, PDFKit for QR codes
- **Testing**: Jest with Supertest for API testing
- **Containerization**: Docker and Docker Compose
- **Process Management**: PM2 for production deployment

## 📋 Prerequisites

- Node.js 18 or higher
- MongoDB 4.4 or higher
- Redis 6 or higher
- Docker and Docker Compose (optional)

## 🚦 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd event-registration-backend
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 3. Using Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### 4. Manual Setup

```bash
# Start MongoDB and Redis services locally
# Then run the application
npm run dev
```

### 5. Database Setup

```bash
# Seed database with demo data
npm run seed

# Or just create admin users
npm run seed -- --skip-events
```

## 🔧 Environment Variables

```env
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://localhost:27017/event_registration

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Authentication
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# Email Service (Choose one)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
# OR
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# External Services
FRONTEND_URL=http://localhost:3000
```

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic services
│   ├── utils/          # Utility functions
│   ├── jobs/           # Background jobs
│   ├── app.js          # Express application
│   └── server.js       # Server entry point
├── scripts/
│   └── seed.js         # Database seeding
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── setup.js        # Test configuration
├── uploads/            # File upload directory
├── logs/              # Application logs
├── docker-compose.yml # Docker services
├── Dockerfile        # Docker image
└── package.json      # Dependencies and scripts
```

## 🔌 API Endpoints

### Public Endpoints

```http
GET    /api/events              # List published events
GET    /api/events/:id          # Get event details
POST   /api/events/:id/register # Register for event
GET    /api/events/:id/check    # Check registration status
```

### Admin Endpoints

```http
# Authentication
POST   /api/admin/auth/login    # Admin login
POST   /api/admin/auth/logout   # Admin logout
GET    /api/admin/auth/me       # Get current admin

# Event Management
GET    /api/admin/events        # List all events
POST   /api/admin/events        # Create event
PUT    /api/admin/events/:id    # Update event
DELETE /api/admin/events/:id    # Delete event
PATCH  /api/admin/events/:id/status # Change event status

# Registration Management
GET    /api/admin/registrations # List registrations
PUT    /api/admin/registrations/:id # Update registration
DELETE /api/admin/registrations/:id # Cancel registration
POST   /api/admin/registrations/:id/approve # Approve registration

# CSV Operations
POST   /api/admin/csv/import    # Import attendees
GET    /api/admin/csv/export    # Export registrations
GET    /api/admin/csv/template  # Download CSV template

# Analytics
GET    /api/admin/analytics     # Dashboard statistics
GET    /api/admin/reports       # Generate reports
```

### System Endpoints

```http
GET    /api/health             # Health check
GET    /api/metrics           # System metrics
```

## 📊 Database Schema

### Events Collection
- Event details, venue information, pricing
- Registration settings, capacity management
- Custom fields, social media links
- Status tracking, audit fields

### Registrations Collection  
- Attendee information, contact details
- Payment status, transaction data
- Custom field responses, check-in status
- QR codes, cancellation tracking

### Admins Collection
- Admin credentials, role-based permissions
- Profile information, activity tracking
- Session management, security settings

### Audit Logs Collection
- Complete activity tracking
- Change history, system events
- Security monitoring, compliance data

## 🔄 Real-time Features

### Socket.IO Events

```javascript
// Client -> Server
socket.emit('join_admin_room');
socket.emit('join_event_room', { eventId });

// Server -> Client
socket.on('registration_created', (data));
socket.on('registration_updated', (data));
socket.on('event_updated', (data));
socket.on('admin_notification', (data));
socket.on('seat_released', (data));
```

### Admin Notifications
- New registrations and cancellations
- Payment status changes
- System alerts and warnings
- Capacity and waitlist updates

## ⚙️ Background Jobs

Automated tasks running via cron scheduler:

- **Auto-promotion** (every 5 min): Move waitlisted attendees to confirmed
- **Seat Hold Cleanup** (every 1 min): Release expired temporary holds  
- **CSV Cleanup** (daily): Remove old exported CSV files
- **Event Reminders** (daily 9 AM): Send email reminders to attendees
- **Status Updates** (hourly): Update event statuses based on dates
- **Audit Cleanup** (weekly): Archive old audit log entries
- **Daily Reports** (midnight): Generate and email daily summaries

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- --testPathPattern=events

# Run integration tests only
npm test -- tests/integration

# Watch mode for development
npm run test:watch
```

### Test Structure
- **Unit Tests**: Model validation, utility functions, middleware
- **Integration Tests**: API endpoints, database operations
- **Mocking**: External services (email, Redis) are mocked
- **Coverage**: Aim for 80%+ code coverage

## 📈 Performance & Monitoring

### Logging
- **Winston** logger with structured JSON output
- **Request tracking** with unique request IDs
- **Error tracking** with stack traces and context
- **Performance metrics** for slow queries and requests

### Caching Strategy
- **Redis** for session storage and rate limiting
- **Database indexes** on frequently queried fields
- **Query optimization** with aggregation pipelines
- **File caching** for static assets

### Security Measures
- **Helmet.js** for security headers
- **Rate limiting** per IP and user
- **Input validation** with Joi schemas
- **SQL injection** prevention with parameterized queries
- **XSS protection** with output sanitization

## 🚀 Deployment

### Docker Production

```bash
# Build production image
docker build -t event-registration-api .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Traditional Deployment

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs
```

### Environment Setup

1. **Production**: Set `NODE_ENV=production`
2. **Database**: Use MongoDB Atlas or dedicated MongoDB instance
3. **Redis**: Use Redis Cloud or dedicated Redis instance
4. **Email**: Configure SendGrid or SMTP provider
5. **Files**: Use cloud storage (AWS S3) for file uploads
6. **SSL**: Configure HTTPS with reverse proxy (Nginx)

## 📚 API Documentation

### Authentication

All admin endpoints require JWT token in Authorization header:

```http
Authorization: Bearer <jwt_token>
```

### Request/Response Format

```json
// Success Response
{
  "success": true,
  "data": {...},
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}

// Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {...}
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Pagination

```http
GET /api/events?page=2&limit=10&sort=startDate&order=desc
```

```json
{
  "success": true,
  "data": {
    "events": [...],
    "pagination": {
      "currentPage": 2,
      "totalPages": 15,
      "totalItems": 150,
      "itemsPerPage": 10,
      "hasNext": true,
      "hasPrev": true
    }
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow ESLint configuration
- Write tests for new features
- Update documentation
- Use conventional commit messages
- Ensure all tests pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- **Documentation**: Check this README and inline code comments
- **Issues**: Open an issue on GitHub
- **Email**: Contact the development team

## 🔄 Changelog

### v1.0.0 (2024-01-15)
- Initial release with full feature set
- Event management and registration system
- Admin panel with role-based access
- Real-time updates with Socket.IO
- Background job processing
- Comprehensive test suite
- Docker containerization
- Production deployment guides

---

**Made with ❤️ for seamless event management**
