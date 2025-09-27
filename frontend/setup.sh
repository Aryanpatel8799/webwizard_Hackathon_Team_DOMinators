#!/bin/bash

# Event Registration Frontend Setup Script
echo "🚀 Setting up Event Registration Frontend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if ! [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is not supported. Please upgrade to Node.js 18+."
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm detected"

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file from .env.example"
        echo "⚠️  Please update the backend API URL in .env if needed"
    else
        echo "VITE_API_URL=http://localhost:4000" > .env
        echo "VITE_SOCKET_URL=http://localhost:4000" >> .env
        echo "VITE_APP_NAME=Event Registration System" >> .env
        echo "VITE_APP_VERSION=1.0.0" >> .env
        echo "✅ Created default .env file"
    fi
else
    echo "✅ .env file already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Run type checking
echo "🔍 Running TypeScript checks..."
npm run type-check

if [ $? -eq 0 ]; then
    echo "✅ TypeScript checks passed"
else
    echo "⚠️  TypeScript checks failed - this is expected until backend is running"
fi

# Run linting
echo "🧹 Running ESLint..."
npm run lint

echo ""
echo "🎉 Frontend setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Make sure the backend is running on the configured port"
echo "2. Update .env file with correct backend URL if needed"
echo "3. Run 'npm run dev' to start the development server"
echo "4. Run 'npm run build' to create production build"
echo ""
echo "🔗 Available commands:"
echo "  npm run dev      - Start development server"
echo "  npm run build    - Build for production"
echo "  npm run preview  - Preview production build"
echo "  npm run lint     - Run ESLint"
echo "  npm run test     - Run tests"
echo ""
echo "🌐 The app will be available at: http://localhost:5173"
echo "📱 Admin panel will be at: http://localhost:5173/admin/login"
