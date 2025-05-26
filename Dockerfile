# Use the official Node.js 18 image based on Alpine Linux
FROM node:18-alpine

# Set the working directory to /app
WORKDIR /app

# Copy all files from the project root into the container
COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Install root-level dependencies (this will install dev dependencies for the frontend)
RUN npm install

# Build the frontend (this creates the /dist folder)
RUN npm run build:frontend

# Build/install the backend dependencies
RUN npm run build:backend

# Install "serve" to serve the built frontend statically and "concurrently" to run both processes at once
RUN npm install -g serve concurrently

# Expose ports for both the backend and the frontend
EXPOSE 3000 5173

# Start both the backend server and the static file server concurrently:
# - "serve -s dist -l 5173" serves the frontend from the /dist folder on port 5173.
# - "node backend/server.js" starts the backend server.
CMD ["concurrently", "\"serve -s dist -l 5173\"", "\"node backend/server.js\""]
