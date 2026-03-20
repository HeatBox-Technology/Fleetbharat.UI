# 1) Dependencies
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 2) Build
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_APP_ENV
ARG NEXT_PUBLIC_GOOGLE_MAPS_KEY
ARG NEXT_PUBLIC_VTS_API_BASE_URL
ARG NEXT_PUBLIC_JAVA_API_BASE_URL

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV
ENV NEXT_PUBLIC_GOOGLE_MAPS_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_KEY
ENV NEXT_PUBLIC_VTS_API_BASE_URL=$NEXT_PUBLIC_VTS_API_BASE_URL
ENV NEXT_PUBLIC_JAVA_API_BASE_URL=$NEXT_PUBLIC_JAVA_API_BASE_URL
RUN npm run build

# 3) Run 
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/messages ./messages

EXPOSE 3000
CMD ["npm", "start"]
