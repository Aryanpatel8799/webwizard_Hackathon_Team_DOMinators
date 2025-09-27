# Event Registration Frontend

A modern, dark-themed frontend application for event registration with real-time updates, built with React 18, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Modern UI/UX**: Dark-first premium theme with glass morphism effects
- **Real-time Updates**: Live seat availability via Socket.IO
- **Responsive Design**: Mobile-first approach with perfect tablet/desktop scaling
- **Admin Dashboard**: Comprehensive event and registration management
- **QR Code Tickets**: Instant ticket generation with download capability
- **Accessibility**: WCAG compliant with full keyboard navigation
- **Performance**: Optimized with React Query caching and code splitting

## 🛠️ Tech Stack

- **React 18** with TypeScript for type safety
- **Vite** for blazing-fast development and optimized builds
- **Tailwind CSS** with custom dark theme configuration
- **TanStack Query** for server state management and caching
- **Socket.IO Client** for real-time event updates
- **Framer Motion** for smooth animations and micro-interactions
- **React Hook Form** with Zod validation
- **Headless UI** for accessible components

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- Backend API running (see backend documentation)
- Modern browser with JavaScript enabled

## 🚦 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd event-registration-frontend
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
nano .env.local
```

Required environment variables:
```env
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

### 3. Development Server

```bash
# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

### 4. Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🐳 Docker Deployment

### Standalone Frontend

```bash
# Build Docker image
docker build -t event-registration-frontend .

# Run container
docker run -p 3000:80 \
  -e VITE_API_URL=http://localhost:4000 \
  -e VITE_SOCKET_URL=http://localhost:4000 \
  event-registration-frontend
```

### With Docker Compose (Full Stack)

```yaml
# docker-compose.yml (add to your existing compose file)
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    environment:
      - VITE_API_URL=http://localhost:4000
      - VITE_SOCKET_URL=http://localhost:4000
    depends_on:
      - backend
```

```bash
# Start full stack
docker-compose up -d
```

## 🎯 Demo Script for Judges

Follow these steps for a 6-minute impressive demo:

### Minute 1-2: Landing Experience
1. Open `http://localhost:3000`
2. **Highlight**: Stunning dark theme, smooth animations
3. **Show**: Event cards with live seat counts, status badges
4. **Demo**: Theme toggle (dark/light mode)

### Minute 3-4: Registration Flow
1. Click "View Details" on any event
2. **Highlight**: Real-time seat counter, progress bar
3. Fill registration form (show validation)
4. **Demo**: Successful registration → QR ticket generation
5. **Show**: Download ticket as PDF/PNG

### Minute 5-6: Admin Features
1. Navigate to `/admin/login`
2. Login with seeded admin:
   - Email: `admin@eventapp.com`
   - Password: `Admin123!`
3. **Demo**: Dashboard with event statistics
4. **Show**: Registration management (promote from waiting list)
5. **Demo**: CSV export functionality
6. **Highlight**: Real-time updates in admin panel

### Key Points to Emphasize
- **Performance**: Instant page loads, optimistic UI updates
- **Accessibility**: Full keyboard navigation, screen reader support
- **Mobile Experience**: Perfect responsive design
- **Real-time**: Live updates without page refresh

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── api/                 # API client and services
│   │   ├── client.ts       # HTTP client configuration
│   │   ├── events.ts       # Event-related API calls
│   │   ├── auth.ts         # Authentication API calls
│   │   └── admin.ts        # Admin API calls
│   ├── components/         # Reusable UI components
│   │   ├── common/         # Generic components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── Badge.tsx
│   │   ├── EventCard.tsx   # Event display card
│   │   ├── EventDetail.tsx # Detailed event view
│   │   ├── RegisterForm.tsx# Registration form
│   │   ├── AdminPanel.tsx  # Admin controls
│   │   ├── Dashboard.tsx   # Admin dashboard
│   │   ├── Ticket.tsx      # QR code ticket
│   │   ├── Navbar.tsx      # Navigation header
│   │   └── Footer.tsx      # Site footer
│   ├── hooks/              # Custom React hooks
│   │   ├── useEvents.ts    # Event data fetching
│   │   ├── useRegister.ts  # Registration logic
│   │   ├── useAdmin.ts     # Admin operations
│   │   ├── useSocket.ts    # Socket.IO integration
│   │   └── useTheme.ts     # Theme management
│   ├── contexts/           # React contexts
│   │   └── AuthContext.tsx # Authentication state
│   ├── pages/              # Route components
│   │   ├── Home.tsx        # Event listing page
│   │   ├── EventPage.tsx   # Single event page
│   │   ├── AdminLogin.tsx  # Admin authentication
│   │   ├── AdminDashboard.tsx # Admin panel
│   │   └── NotFound.tsx    # 404 page
│   ├── types/              # TypeScript definitions
│   │   └── index.ts        # Shared types
│   ├── utils/              # Utility functions
│   │   ├── cn.ts           # Class name utilities
│   │   ├── format.ts       # Date/text formatting
│   │   └── validation.ts   # Form validation schemas
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # App entry point
│   └── index.css           # Global styles
├── public/                 # Static assets
├── index.html              # HTML template
├── tailwind.config.js      # Tailwind configuration
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration
└── Dockerfile              # Docker configuration
```

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start dev server with hot reload
npm run build        # Build for production
npm run preview      # Preview production build locally

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run type-check   # Run TypeScript compiler check

# Testing
npm run test         # Run test suite
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

## 🎨 Customization

### Theme Configuration

Edit `tailwind.config.js` to customize:
- Color palette (primary, secondary, accent colors)
- Typography scale and fonts
- Spacing and sizing scales
- Animation durations

### API Integration

Modify `src/api/client.ts` to:
- Add request/response interceptors
- Implement retry logic
- Add custom error handling
- Configure timeout settings

### Socket Events

Extend `src/hooks/useSocket.ts` for additional real-time features:
- Event-specific notifications
- Admin broadcast messages
- System status updates

## 🧪 Testing

The app includes comprehensive testing setup:

```bash
# Run all tests
npm test

# Run specific test file
npm test EventCard.test.tsx

# Generate coverage report
npm run test:coverage
```

### Test Files Included
- `__tests__/Home.test.tsx` - Home page event loading
- `__tests__/RegisterForm.test.tsx` - Form validation
- `__tests__/AdminLogin.test.tsx` - Authentication flow

## 📱 Mobile Experience

The app is designed mobile-first with:
- Touch-friendly interface elements
- Optimized form inputs for mobile keyboards
- Responsive navigation patterns
- Performance optimized for mobile networks

## ♿ Accessibility Features

Full WCAG 2.1 AA compliance:
- Semantic HTML structure
- ARIA labels and descriptions
- Keyboard navigation support
- Focus management in modals
- High contrast color schemes
- Screen reader optimization

## 🚀 Performance Optimizations

- **Code Splitting**: Admin routes loaded on-demand
- **Image Optimization**: Responsive images with WebP support
- **Caching**: Aggressive caching with React Query
- **Bundle Analysis**: Optimized chunk sizes
- **Tree Shaking**: Unused code elimination

## 🔒 Security Considerations

- JWT tokens stored in localStorage with expiration
- XSS protection through proper sanitization
- CSRF protection via token-based auth
- Secure API communication over HTTPS (production)

## 🌐 Environment Variables

```env
# Required
VITE_API_URL=http://localhost:4000        # Backend API URL
VITE_SOCKET_URL=http://localhost:4000     # Socket.IO server URL

# Optional
VITE_APP_TITLE="Event Registration"      # App title
VITE_SENTRY_DSN=                          # Error tracking
VITE_GA_ID=                               # Google Analytics
```

## 🐛 Troubleshooting

### Common Issues

**CORS Errors**
```bash
# Ensure backend allows frontend origin
# Check CORS configuration in backend
```

**Socket Connection Fails**
```bash
# Verify VITE_SOCKET_URL matches backend
# Check firewall/network configuration
```

**Build Fails**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**API Calls Fail**
```bash
# Verify backend is running
# Check network tab in browser dev tools
# Validate API endpoints match backend documentation
```

### Development Tips

1. **Hot Reload Issues**: Restart dev server if changes aren't reflected
2. **Type Errors**: Run `npm run type-check` for detailed TypeScript errors
3. **Styling Issues**: Check Tailwind classes are properly configured
4. **Socket Issues**: Monitor browser console for connection logs

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Follow code style guidelines (ESLint + Prettier)
4. Write tests for new features
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Open an issue on GitHub
- **Demo**: Follow the demo script above for quick start

---

