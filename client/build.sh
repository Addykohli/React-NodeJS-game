#!/bin/bash

# Install dependencies
npm install

# Ensure react-scripts is installed globally (as a backup)
npm install -g react-scripts

# Make node_modules/.bin executable
chmod +x node_modules/.bin/*

# Make react-scripts executable specifically
chmod +x node_modules/.bin/react-scripts

# Clear any previous build
rm -rf build

# Set environment variable and run build
CI=false ./node_modules/.bin/react-scripts build 