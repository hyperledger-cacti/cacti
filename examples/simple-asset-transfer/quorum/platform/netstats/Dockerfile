FROM node:8-alpine
WORKDIR /usr/src/app
COPY eth-netstats/ .
ENV PORT=4040
EXPOSE 4040
RUN npm install && npm install grunt-cli && node_modules/.bin/grunt && npm remove grunt-cli
ENTRYPOINT npm start
