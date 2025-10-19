# Use Node.js base image (includes Python 3)
FROM node:20-alpine AS base

# Install Python and pip (Alpine for lightweight)
RUN apk add --no-cache python3 py3-pip

# Set working directory
WORKDIR /app

# Copy Python requirements and install deps
COPY requirements.txt .
RUN pip3 install -r requirements.txt

# Copy Node app
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Expose port
EXPOSE 10000

# Health check (optional)
HEALTHCHECK CMD curl --fail http://localhost:10000 || exit 1

# Start Node server
CMD ["node", "server.js"]
