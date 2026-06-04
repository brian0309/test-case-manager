FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm install

FROM deps AS backend-build
COPY backend/ ./backend/
RUN npx tsc -p backend/tsconfig.json

FROM base AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM base AS production
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=backend-build /app/dist ./dist
COPY --from=backend-build /app/backend/mailtrap ./backend/mailtrap
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

EXPOSE 5000

CMD ["sh", "-c", "node dist/backend/index.js"]
