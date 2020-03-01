FROM node:10-alpine

RUN apk update
RUN apk add python3-dev libstdc++ g++ make

ADD ./api /src
ADD ./contracts /contracts
ADD ./artifacts /artifacts

WORKDIR /src

RUN npm install

ENV HOST 0.0.0.0
ENV PORT 4000

CMD ["node", "app"]