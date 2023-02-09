FROM node:10

USER root
WORKDIR /fabric-cli

ADD . .
COPY .npmrc /root

RUN npm install
RUN yarn link
RUN rm /root/.npmrc
