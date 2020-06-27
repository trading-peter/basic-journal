FROM node:12.18.0-alpine

RUN apk -U upgrade

WORKDIR /home/node/app
ADD server server

RUN cd server && npm rebuild

USER node
WORKDIR /home/node/app/server

CMD node server.js
