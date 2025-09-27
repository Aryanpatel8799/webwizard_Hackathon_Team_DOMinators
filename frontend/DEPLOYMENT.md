# Event Registration Frontend - Production Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: Docker Deployment (Recommended)

1. **Build the Docker image:**
   ```bash
   docker build -t event-registration-frontend .
   ```

2. **Run the container:**
   ```bash
   docker run -d -p 8080:80 --name event-frontend event-registration-frontend
   ```

3. **Access the app:**
   - Frontend: http://localhost:8080
   - Admin: http://localhost:8080/admin/login

### Option 2: Traditional Build & Deploy

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build for production:**
   ```bash
   npm run build
   ```

3. **Deploy the `dist/` folder to your web server**

### Option 3: Vercel Deployment

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel --prod
   ```

### Option 4: Netlify Deployment

1. **Install Netlify CLI:**
   ```bash
   npm i -g netlify-cli
   ```

2. **Build and deploy:**
   ```bash
   npm run build
   netlify deploy --prod --dir=dist
   ```

## 🔧 Environment Configuration

### Required Environment Variables

Create a `.env` file with:

```bash
VITE_API_URL=https://your-backend-api.com/api
VITE_SOCKET_URL=https://your-backend-api.com
VITE_APP_NAME=Event Registration System
VITE_APP_VERSION=1.0.0
```

### Development vs Production URLs

- **Development:** `http://localhost:4000`
- **Production:** Replace with your actual backend URL

## 📋 Pre-Deployment Checklist

- [ ] Backend API is deployed and accessible
- [ ] Environment variables are configured
- [ ] SSL certificate is configured (HTTPS)
- [ ] CORS is configured on backend for frontend domain
- [ ] Admin credentials are secured
- [ ] Error monitoring is set up (optional)

## 🔍 Troubleshooting

### Common Issues

1. **API Connection Errors:**
   - Verify `VITE_API_URL` is correct
   - Check CORS configuration
   - Ensure backend is running

2. **Build Failures:**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Update Node.js to version 18+
   - Check for TypeScript errors: `npm run type-check`

3. **Routing Issues (404 on refresh):**
   - Configure web server for SPA routing
   - Nginx: Use provided nginx.conf
   - Apache: Add .htaccess file

### Health Check Endpoints

- **Frontend:** `GET /` (should return HTML)
- **Backend:** `GET /api/health` (should return JSON)

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend │────│   Nginx/CDN      │────│   Backend API   │
│   (Vite Build)   │    │   (Static Files) │    │   (Node.js)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📊 Performance Optimization

### Already Implemented:
- Code splitting with lazy loading
- Image optimization
- Bundle size optimization
- Gzip compression (nginx.conf)
- Static asset caching

### Additional Optimizations:
- Use CDN for static assets
- Enable HTTP/2
- Implement service worker for caching
- Add monitoring and analytics

## 🛡️ Security Considerations

### Implemented:
- JWT token storage in localStorage
- Input validation with Zod schemas
- HTTPS enforcement in production
- Security headers (nginx.conf)

### Additional Security:
- Rate limiting on backend
- Input sanitization
- Content Security Policy
- Regular dependency updates

## 📈 Monitoring & Analytics

### Recommended Tools:
- **Error Tracking:** Sentry, Rollbar
- **Analytics:** Google Analytics, Mixpanel
- **Performance:** Web Vitals, Lighthouse CI
- **Uptime:** Pingdom, StatusCake

## 🎯 Demo Script for Hackathon (6 minutes)

### Minute 1-2: Overview & Features
1. Open homepage - show modern dark theme
2. Demonstrate search and filtering
3. Show responsive design (mobile view)

### Minute 3-4: User Registration Flow
1. Click on event card
2. Fill registration form with validation
3. Show success feedback and email confirmation

### Minute 5-6: Admin Dashboard
1. Login to admin panel (/admin/login)
2. Show dashboard with statistics
3. Demonstrate event management
4. Show real-time seat updates
5. Export functionality

### Key Talking Points:
- Modern React 18 + TypeScript stack
- Real-time updates with Socket.IO
- Responsive design with Tailwind CSS
- Production-ready with Docker
- Complete CRUD operations
- Form validation and error handling
- JWT authentication
- Data export capabilities

## 📞 Support

For deployment issues or questions:
1. Check the troubleshooting section above
2. Verify all environment variables
3. Check backend API connectivity
4. Review browser console for errors

---

**🎉 Your Event Registration System is ready for production!**
