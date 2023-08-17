
FROM node:16-alpine

WORKDIR /usr/src/app

COPY ./examples/cbdc-bridging-fabric-evm-frontend/package.json ./

RUN npm install

COPY ./examples/cbdc-bridging-fabric-evm-frontend/ .

EXPOSE 2000

CMD [ "npm", "start" ]
