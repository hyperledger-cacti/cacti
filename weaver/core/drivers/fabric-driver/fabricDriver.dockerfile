ARG BUILD_TAG

# Local Build
# FROM node:16 AS builder-local
# 
# WORKDIR /fabric-driver

# ADD protos-js /fabric-driver/protos-js

# Remote build
FROM node:16 AS builder-remote

WORKDIR /fabric-driver

ADD .npmrc .
ADD package.json .
RUN npm install --unsafe-perm

ADD server /fabric-driver/server
ADD constants /fabric-driver/constants
ADD tsconfig.json .
ADD .eslintrc .
ADD .prettierrc .

RUN npm run build

FROM builder-${BUILD_TAG} AS builder

RUN rm -rf node_modules
RUN npm ci --only=production

FROM node:16-alpine AS prod

RUN addgroup -g 1001 relay
RUN adduser -D -s /bin/sh -u 1001 -G relay relay

ENV NODE_ENV production

WORKDIR /fabric-driver

ADD package.json .

COPY --from=builder /fabric-driver/package-lock.json /fabric-driver/
COPY --from=builder /fabric-driver/node_modules /fabric-driver/node_modules
COPY --from=builder /fabric-driver/out /fabric-driver/out
COPY --from=builder /fabric-driver/constants /fabric-driver/constants

RUN chown -R relay:relay /fabric-driver

USER relay

ARG GIT_URL
LABEL org.opencontainers.image.source ${GIT_URL}
