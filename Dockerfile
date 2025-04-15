FROM node:16-alpine

# Install build dependencies
RUN apk add --no-cache make gcc g++ python3

# Create app directory
WORKDIR /TSS-Final/server.js

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install dependencies including production dependencies
RUN npm install --unsafe-perm
RUN npm rebuild bcrypt --build-from-source

# Copy app source code
COPY . .

# Set NODE_ENV to production
ENV NODE_ENV=production

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]
