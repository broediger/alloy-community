# Build stage
FROM node:24-slim AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# Runtime stage
FROM node:24-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.js"]
