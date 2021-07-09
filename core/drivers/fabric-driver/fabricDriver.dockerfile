FROM node:14

WORKDIR /fabric-driver

ADD .npmrc .
ADD package.json .

RUN npm install --unsafe-perm

ADD patches .
ADD server .
ADD config.json .
ADD temp.pem .
ADD tsconfig.json .
ADD .eslintrc .
ADD .prettierrc .

RUN npm run postinstall
RUN npm run build

ARG GIT_URL
LABEL org.opencontainers.image.source ${GIT_URL}
