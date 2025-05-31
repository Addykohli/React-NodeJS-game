#!/bin/bash

# Install dependencies
npm install

# Clear any previous build
rm -rf build

# Set environment variable and run build
CI=false npm run build 