FROM node:24-slim AS build
WORKDIR /app
COPY package.json ./package.json
ARG NEXT_PUBLIC_API_URL=https://api.example.com/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm install
COPY app ./app
COPY lib ./lib
COPY next.config.mjs ./next.config.mjs
RUN npm run build

FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app ./
USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
