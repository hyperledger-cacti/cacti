FROM node:14

WORKDIR /fabric-driver

ADD .npmrc .
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
