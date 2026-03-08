FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN rm -f package-lock.json && npm install

COPY . .

ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
