FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Prune development dependencies to keep image small
RUN npm prune --production

# Expose the port the app runs on
ENV PORT=5000
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
