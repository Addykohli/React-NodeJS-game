FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install dependencies
RUN npm install

COPY . .

# Build argument for the backend URL
ARG REACT_APP_SERVER_URL
ENV REACT_APP_SERVER_URL=$REACT_APP_SERVER_URL

# Build the React application
RUN npm run build

EXPOSE 3000

CMD ["node", "server.js"]
