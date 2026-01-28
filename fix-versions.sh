#!/bin/bash
echo "========================================="
echo "Fixing Package Versions for Expo SDK 54"
echo "========================================="
echo ""
echo "Removing node_modules and package-lock.json..."
rm -rf node_modules package-lock.json

echo ""
echo "Installing correct versions..."
npm install

echo ""
echo "========================================="
echo "Installation Complete!"
echo "========================================="
echo ""
echo "Now run: npm start"
echo ""
