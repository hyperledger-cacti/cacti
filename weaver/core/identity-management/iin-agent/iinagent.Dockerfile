ARG BUILD_TAG

# Local Build
# FROM node:16 AS builder-local
# 
# WORKDIR /opt/iinagent

# ADD protos-js /opt/iinagent/protos-js

# Remote build
FROM node:16 AS builder-remote

WORKDIR /opt/iinagent

ADD .npmrc .
ADD package.json .
RUN npm install --unsafe-perm

ADD src /opt/iinagent/src
ADD tsconfig.json .

RUN npm run build

FROM builder-${BUILD_TAG} AS builder

RUN rm -rf node_modules
RUN npm ci --only=production

FROM node:16-alpine AS prod

RUN addgroup -g 1001 iinagent
RUN adduser -D -s /bin/sh -u 1001 -G iinagent iinagent

ENV NODE_ENV production

WORKDIR /opt/iinagent

ADD package.json .

COPY --from=builder /opt/iinagent/package-lock.json /opt/iinagent/
COPY --from=builder /opt/iinagent/node_modules /opt/iinagent/node_modules
COPY --from=builder /opt/iinagent/out /opt/iinagent/out

RUN chown -R iinagent:iinagent /opt/iinagent

USER iinagent

ARG GIT_URL
LABEL org.opencontainers.image.source ${GIT_URL}
