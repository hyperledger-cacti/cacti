ARG BUILD_TAG

# Local Build
# FROM node:14 AS builder-local
# 
# WORKDIR /fabric-driver

# ADD protos-js /fabric-driver/protos-js

# Remote build
FROM node:14 AS builder-remote

WORKDIR /fabric-driver

ADD .npmrc .

# Common Build for both
FROM builder-${BUILD_TAG} AS prod

ADD package.json .

RUN npm install --unsafe-perm

ADD patches /fabric-driver/patches
ADD server /fabric-driver/server
ADD config.json .
ADD temp.pem .
ADD tsconfig.json .
ADD .eslintrc .
ADD .prettierrc .

RUN npm run build
RUN npm run postinstall

ARG GIT_URL
LABEL org.opencontainers.image.source ${GIT_URL}
