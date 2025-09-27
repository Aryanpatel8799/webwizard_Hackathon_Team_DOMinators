# 🎟️ EventWare - Modern Event Registration Platform
Google Drive link :https://drive.google.com/file/d/1U8TCtkw42n8_CBKdPmtHNd-rO3HWUi-P/view?usp=sharing

Webiste SS :
<img width="1710" height="982" alt="hi1" src="https://github.com/user-attachments/assets/05541232-0b61-4117-8098-85b680d153f7" />

<img width="1710" height="984" alt="hi5" src="https://github.com/user-attachments/assets/382c9645-e86f-4461-b0f3-f055df8c8476" />
<img width="1710" height="984" alt="hi3" src="https://github.com/user-attachments/assets/f74db305-03bf-4f87-be3c-5ed317c6b7b1" />
<img width="1710" height="983" alt="hi2" src="https://github.com/user-attachments/assets/607ca827-663b-4e8a-b62b-e96b62c2b4ac" />



> **A comprehensive, production-ready event registration system built for the Web Wizard Hackathon by Team DOMinators**

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green.svg)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7+-black.svg)](https://socket.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)


## 📋 Table of Contents
- [🚀 Overview](#-overview)
- [✨ Key Features](#-key-features)
- [🛠️ Technology Stack](#️-technology-stack)
- [🏗️ Architecture](#️-architecture)
- [📱 Screenshots](#-screenshots)
- [⚡ Quick Start](#-quick-start)
- [🐳 Docker Deployment](#-docker-deployment)
- [🔧 Configuration](#-configuration)
- [📊 Admin Dashboard](#-admin-dashboard)
- [🔄 Real-time Features](#-real-time-features)
- [📧 Email System](#-email-system)
- [🧪 Testing](#-testing)
- [🚀 Deployment](#-deployment)
- [👥 Team](#-team)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## 🚀 Overview

EventWare is a modern, full-stack event registration platform designed to handle everything from small meetups to large conferences. Built with performance, scalability, and user experience in mind, it provides both attendees and administrators with a seamless event management experience.

### 🎯 Problem Statement
Traditional event registration systems are often clunky, slow, and lack real-time updates. EventWare solves these problems by providing:
- **Instant Updates**: Real-time seat availability and registration status
- **Modern UI/UX**: Clean, responsive design that works on all devices
- **Comprehensive Admin Tools**: Complete event and attendee management
- **Automated Workflows**: Email notifications, QR tickets, and waiting list management

### 🏆 What Makes EventWare Special
- **🔥 Real-time Everything**: Live seat counts, instant notifications, real-time admin dashboard
- **🎨 Beautiful Design**: Dark-first theme with glassmorphism effects and smooth animations
- **⚡ Lightning Fast**: Optimized with React Query caching and efficient database queries
- **🛡️ Production Ready**: Comprehensive error handling, logging, and monitoring
- **📱 Mobile First**: Perfect responsive experience across all devices
- **♿ Accessible**: WCAG compliant with full keyboard navigation support

## ✨ Key Features

### 🎪 For Event Organizers
- **📅 Complete Event Management**: Create, edit, and manage events with rich details
- **👥 Attendee Management**: View, approve, and manage all registrations
- **📊 Real-time Analytics**: Live dashboard with event statistics and trends
- **📧 Bulk Email System**: Send customized emails to all or selected participants
- **📄 CSV Import/Export**: Bulk operations for large-scale event management
- **🎟️ QR Code Tickets**: Automatic ticket generation with QR codes
- **⏱️ Waiting List Management**: Automatic promotion from waiting lists
- **🔔 Smart Notifications**: Real-time alerts for new registrations and updates

### 🎫 For Attendees  
- **🔍 Event Discovery**: Search and filter events by category, date, location
- **⚡ Instant Registration**: Quick, validated registration forms
- **📱 Mobile Tickets**: Download QR tickets as PDF or PNG
- **🔄 Real-time Updates**: Live seat availability and event updates
- **📧 Email Confirmations**: Automated confirmation and reminder emails
- **🎯 Registration Status**: Track application status in real-time
- **♿ Accessibility**: Full keyboard navigation and screen reader support

### 🔧 Technical Features
- **🚀 Real-time Communication**: Socket.IO for instant updates
- **🔐 Secure Authentication**: JWT-based admin authentication
- **📈 Performance Monitoring**: Built-in logging and error tracking
- **🐳 Docker Ready**: Containerized deployment with Docker Compose
- **🧪 Test Coverage**: Comprehensive testing suite
- **📖 API Documentation**: Complete API documentation
- **🔄 Background Jobs**: Automated email sending and cleanup tasks
- **🛡️ Security**: Rate limiting, input validation, and CORS protection

## 🛠️ Technology Stack

### Frontend (React + TypeScript)
```json
{
  "framework": "React 18.2.0",
  "language": "TypeScript 5.0+",
  "styling": "Tailwind CSS 3.3+",
  "state_management": "TanStack Query + Context API",
  "animations": "Framer Motion",
  "forms": "React Hook Form + Zod",
  "build_tool": "Vite",
  "real_time": "Socket.IO Client",
  "testing": "Jest + React Testing Library"
}
```

### Backend (Node.js + Express)
```json
{
  "runtime": "Node.js 18+",
  "framework": "Express.js 4.18+",
  "language": "JavaScript ES6+",
  "database": "MongoDB 6.0+ with Mongoose",
  "real_time": "Socket.IO Server",
  "authentication": "JWT + bcrypt",
  "email": "Nodemailer with SMTP",
  "file_processing": "Multer + CSV Parse",
  "background_jobs": "Node Cron",
  "logging": "Winston",
  "testing": "Jest + Supertest"
}
```

### Infrastructure & DevOps
```json
{
  "containerization": "Docker + Docker Compose",
  "reverse_proxy": "Nginx",
  "caching": "Redis (optional)",
  "monitoring": "Winston Logging",
  "deployment": "PM2 Process Manager",
  "ci_cd": "GitHub Actions Ready"
}
```

## 🏗️ Architecture

EventWare follows a modern, scalable architecture pattern:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React/TS)    │◄──►│   (Node.js)     │◄──►│   (MongoDB)     │
│                 │    │                 │    │                 │
│ • React Query   │    │ • Express.js    │    │ • User Data     │
│ • Socket.IO     │    │ • Socket.IO     │    │ • Events        │
│ • Tailwind      │    │ • JWT Auth      │    │ • Registrations │
│ • Framer Motion │    │ • Nodemailer    │    │ • Admin Logs    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │   Redis Cache   │              │
         └──────────────┤   (Optional)    ├──────────────┘
                        │                 │
                        │ • Session Store │
                        │ • Rate Limiting │
                        │ • Job Queue     │
                        └─────────────────┘
```

### Key Architectural Decisions
- **🎯 Separation of Concerns**: Clean separation between frontend, backend, and database
- **📡 Real-time First**: Socket.IO integration for instant updates
- **🔄 Reactive State**: React Query for efficient server state management  
- **🛡️ Security Layers**: Multiple security measures including rate limiting and validation
- **⚡ Performance**: Optimized queries, caching, and lazy loading
- **📈 Scalability**: Stateless design ready for horizontal scaling

## 📱 Screenshots

### 🎨 Landing Page
![Landing Page](https://via.placeholder.com/800x400/1f2937/ffffff?text=Modern+Event+Landing+Page)
*Beautiful dark theme with live event cards and real-time seat availability*

### 📊 Admin Dashboard  
![Admin Dashboard](https://via.placeholder.com/800x400/1f2937/ffffff?text=Comprehensive+Admin+Dashboard)
*Complete event management with analytics, registrations, and real-time monitoring*

### 🎟️ Registration Flow
![Registration](https://via.placeholder.com/800x400/1f2937/ffffff?text=Smooth+Registration+Experience)
*Intuitive registration form with instant validation and QR ticket generation*

## ⚡ Quick Start

### Prerequisites
```bash
# Required Software
- Node.js 18+ and npm
- MongoDB 6.0+
- Git

# Optional (for production)
- Docker & Docker Compose
- Redis (for caching)
- Nginx (reverse proxy)
```

### 🚀 Development Setup

1. **Clone the Repository**
```bash
git clone https://github.com/Aryanpatel8799/webwizard_Hackathon_Team_DOMinators.git
cd webwizard_Hackathon_Team_DOMinators
```

2. **Backend Setup**
```bash
cd backend

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your MongoDB URL and other settings

# Seed the database (creates admin user and sample data)
npm run seed

# Start development server
npm run dev
```

3. **Frontend Setup** (New Terminal)
```bash
cd frontend

# Install dependencies  
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your backend URL

# Start development server
npm run dev
```

4. **Access the Application**
```bash
Frontend: http://localhost:3000
Backend API: http://localhost:4000
```

### 🔑 Default Admin Credentials
```
Email: admin@eventapp.com
Password: Admin123!


## 🐳 Docker Deployment

### Quick Docker Setup
```bash
# Clone and navigate
git clone https://github.com/Aryanpatel8799/webwizard_Hackathon_Team_DOMinators.git
cd webwizard_Hackathon_Team_DOMinators

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Access application
# Frontend: http://localhost:3000  
# Backend: http://localhost:4000
```

### Docker Configuration
```yaml
# docker-compose.yml structure
services:
  - mongodb: Database service
  - redis: Caching service  
  - backend: Node.js API server
  - frontend: React application
  - nginx: Reverse proxy
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/eventware
DB_NAME=eventware

# JWT Authentication  
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@eventware.com
FROM_NAME=EventWare

# Server Configuration
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Optional Services
REDIS_URL=redis://localhost:6379
SENTRY_DSN=your-sentry-dsn
```

#### Frontend (.env)
```bash
# API Configuration
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000

# Application Settings
VITE_APP_NAME=EventWare
VITE_APP_VERSION=1.0.0
VITE_ENABLE_DEVTOOLS=true

# Optional Analytics
VITE_GA_TRACKING_ID=GA-XXXXXXXXX
```

## 📊 Admin Dashboard

The admin dashboard provides comprehensive event and attendee management:

### 📈 Dashboard Features
- **📊 Analytics Overview**: Event statistics, registration trends, revenue tracking
- **📅 Event Management**: Create, edit, delete, and publish events
- **👥 Attendee Management**: View, approve, promote, and manage registrations  
- **📧 Bulk Communication**: Send targeted emails to attendees
- **📄 Data Operations**: CSV import/export for bulk operations
- **🔔 Notification Center**: Real-time alerts and system notifications
- **⚙️ System Monitoring**: Performance metrics and error tracking
- **📁 File Management**: Upload and manage event images and documents

### 🎯 Admin Capabilities
```javascript
// Admin permissions structure
{
  "events": {
    "create": true,
    "read": true, 
    "update": true,
    "delete": true
  },
  "registrations": {
    "create": true,
    "read": true,
    "update": true, 
    "delete": true
  },
  "analytics": {
    "read": true
  },
  "admin": {
    "read": true,
    "create": true,
    "update": true,
    "delete": false
  }
}
```

## 🔄 Real-time Features

EventWare leverages Socket.IO for instant, real-time updates:

### 📡 Real-time Events
```javascript
// Client receives real-time updates for:
- Event seat availability changes
- New registrations and cancellations  
- Admin notifications and alerts
- System status and error messages
- Waiting list promotions
- Registration status updates
```

### 🔌 Socket.IO Integration
```javascript
// Frontend connection
const socket = io('http://localhost:4000', {
  auth: {
    token: localStorage.getItem('admin_token')
  }
});

// Join event room for updates
socket.emit('join:event', eventId);

// Listen for real-time updates
socket.on('registration:created', (data) => {
  updateEventStats(data);
});
```

## 📧 Email System

Comprehensive automated email system with beautiful templates:

### 📬 Email Types
- **✅ Registration Confirmation**: Welcome email with QR ticket
- **⏳ Waiting List Notification**: Queue position and estimated wait
- **🎉 Promotion Confirmation**: Moved from waiting list to confirmed
- **❌ Cancellation Confirmation**: Registration cancelled
- **📢 Event Updates**: Important event information changes
- **⏰ Event Reminders**: Automated reminders before events
- **📊 Admin Reports**: Daily/weekly summary reports

### 🎨 Email Templates
```javascript
// Email template features:
- Responsive HTML design
- Event-specific branding
- QR code ticket embedding
- Personalized content
- Unsubscribe links
- Social media integration
```

## 🧪 Testing

Comprehensive testing suite for reliability:

### Backend Testing
```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- --grep "Event Controller"
```

### Frontend Testing  
```bash
cd frontend

# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### 📊 Test Coverage
- **Backend**: Controllers, Services, Models, Middleware
- **Frontend**: Components, Hooks, Utilities, Pages
- **Integration**: API endpoints, Database operations
- **E2E**: Critical user flows and admin operations

## 🚀 Deployment

### Production Deployment Options

#### 1. 🐳 Docker Deployment (Recommended)
```bash
# Production Docker setup
docker-compose -f docker-compose.prod.yml up -d

# With SSL and Nginx
docker-compose -f docker-compose.prod.yml -f docker-compose.ssl.yml up -d
```

#### 2. ☁️ Cloud Platform Deployment
```bash
# Supported platforms:
- Heroku (with MongoDB Atlas)
- AWS (EC2 + RDS/DocumentDB)
- Google Cloud Platform
- DigitalOcean Droplets
- Vercel (Frontend) + Railway (Backend)
```

#### 3. 🖥️ VPS Deployment
```bash
# Ubuntu/Debian VPS setup
curl -fsSL https://raw.githubusercontent.com/Aryanpatel8799/webwizard_Hackathon_Team_DOMinators/main/scripts/deploy.sh | bash
```

### 📊 Performance Optimizations
- **Frontend**: Code splitting, lazy loading, image optimization
- **Backend**: Connection pooling, query optimization, caching
- **Database**: Proper indexing, aggregation pipelines
- **Infrastructure**: CDN integration, load balancing ready

## 👥 Team

**Team DOMinators** - Web Wizard Hackathon

### 🧑‍💻 Team Members
- **[Aryan Patel](https://github.com/Aryanpatel8799)** - Full Stack Developer & Team Lead
  - Backend Architecture & API Development
  - Database Design & Optimization
  - DevOps & Deployment

- **[Team Member 2]** - Frontend Specialist
  - React Components & State Management
  - UI/UX Design & Animation
  - Responsive Design Implementation

- **[Team Member 3]** - Backend Developer
  - Real-time Features & Socket.IO
  - Email System & Background Jobs
  - Testing & Quality Assurance

### 🎯 Development Process
- **Agile Methodology**: Sprint-based development with daily standups
- **Git Workflow**: Feature branches with code review process
- **Quality Assurance**: Comprehensive testing and code coverage
- **Documentation**: Complete API docs and user guides

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### 🔧 Development Setup
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Commit with conventional commits (`feat: add amazing feature`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### 📝 Contribution Guidelines
- Follow existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Use descriptive commit messages
- Keep PRs focused and atomic

### 🐛 Bug Reports
Use GitHub Issues to report bugs:
- Include browser/OS information
- Provide steps to reproduce
- Include screenshots if applicable
- Check existing issues first

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Team DOMinators

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 🌟 Additional Information

### 🎪 Demo & Presentation
- **Live Demo**: [EventWare Demo](https://eventware-demo.com)
- **Video Walkthrough**: [YouTube Demo](https://youtube.com/watch?v=demo)
- **Presentation Slides**: [Google Slides](https://slides.google.com/demo)

### 📚 Documentation
- **API Documentation**: Available at `/api/docs` when running
- **Frontend Components**: Storybook documentation included  
- **Database Schema**: ERD diagrams in `/docs` folder
- **Architecture Decisions**: ADR documents in `/docs/architecture`

### 🏆 Hackathon Highlights
- **⚡ Built in 48 hours**: Complete full-stack application
- **🎯 Problem-focused**: Solves real event management pain points
- **🚀 Production-ready**: Comprehensive error handling and security
- **📱 Mobile-first**: Perfect experience across all devices
- **🔥 Modern stack**: Latest technologies and best practices
- **♿ Accessible**: WCAG compliant design and functionality

### 📞 Support & Contact
- **Email**: team.dominators@hackathon.com
- **GitHub Issues**: For bug reports and feature requests
- **Discord**: [Team DOMinators Server](https://discord.gg/dominators)
- **Documentation**: [Wiki Pages](https://github.com/Aryanpatel8799/webwizard_Hackathon_Team_DOMinators/wiki)

---

<div align="center">

**Built with ❤️ by Team DOMinators for Web Wizard Hackathon 2024**

⭐ **If you found this project helpful, please give it a star!** ⭐

[![GitHub stars](https://img.shields.io/github/stars/Aryanpatel8799/webwizard_Hackathon_Team_DOMinators.svg?style=social&label=Star&maxAge=2592000)](https://github.com/Aryanpatel8799/webwizard_Hackathon_Team_DOMinators/stargazers/)
[![GitHub forks](https://img.shields.io/github/forks/Aryanpatel8799/webwizard_Hackathon_Team_DOMinators.svg?style=social&label=Fork&maxAge=2592000)](https://github.com/Aryanpatel8799/webwizard_Hackathon_Team_DOMinators/network/)

</div>
