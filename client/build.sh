#!/bin/bash

# Install dependencies
npm install

# Build the React app using direct path
CI=false node ./node_modules/react-scripts/scripts/build.js 