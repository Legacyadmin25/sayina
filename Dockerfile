FROM node:16-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Create upload directories
RUN mkdir -p uploads/documents uploads/logos

# Set environment variables
ENV NODE_ENV=production
# PORT is intentionally NOT hardcoded — Railway injects it at runtime

# Expose Railway's dynamic port
EXPOSE ${PORT:-3000}

# Run migrations then start server
CMD ["sh", "-c", "npm run migrate && npm start"]
