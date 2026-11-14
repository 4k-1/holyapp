# Production image: builds the website, then runs it and the API together on one port.
#   docker build -t holyapp .
#   docker run -p 5000:5000 --env-file server/.env.production holyapp
# The site is then at http://localhost:5000 and the API at http://localhost:5000/api.
# (docker-compose.yml and the Dockerfiles in client/ and server/ are for development only.)

# 1. Build the website. The API sits on the same address, under /api.
FROM node:20-alpine AS client
WORKDIR /client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
ENV VITE_API_URL=/api
RUN npm run build

# 2. The server, with the built website in ./public.
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client /client/dist ./public
EXPOSE 5000
USER node
# Bring the database up to date, then start. A failed migration stops the start.
CMD ["sh", "-c", "node scripts/migrate.js up && node src/serve.js"]
