FROM node:10-alpine
RUN apk update && apk upgrade && apk add --update netcat-openbsd && rm -rf /var/cache/apk/*
ADD ./api /src
ADD ./contracts /contracts
WORKDIR /src
CMD sh -c './scripts/wait-for.sh -t 6000 qserver1:5050 -- node index.js'