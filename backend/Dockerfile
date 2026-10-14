FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./package.json
RUN npm install --omit=dev
COPY src ./src
COPY scripts ./scripts
USER node
EXPOSE 4000
CMD ["npm", "start"]
