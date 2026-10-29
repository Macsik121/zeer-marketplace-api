FROM node:14

WORKDIR /app

COPY . .

RUN rm -rf node_modules package-lock.json && \
    npm install --production && \
    npm install pg@8.23.1 --save-exact

EXPOSE 3000

CMD ["npm", "start"]
