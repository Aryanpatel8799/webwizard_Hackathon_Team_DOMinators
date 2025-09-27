#!/bin/bash

echo "Installing missing npm packages..."

# Install the missing packages that were added to package.json
npm install node-cron @faker-js/faker

echo "Installation complete!"
echo ""
echo "To start the server:"
echo "npm run dev"
