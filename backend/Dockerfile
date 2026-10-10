FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --omit=dev --workspace backend

FROM node:22-alpine
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY backend/package.json ./backend/package.json
COPY backend/src ./backend/src
USER node
EXPOSE 3000
CMD ["node", "backend/src/server.js"]
