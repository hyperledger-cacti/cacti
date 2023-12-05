

FROM node:16-alpine

WORKDIR /usr/src/app

COPY package.json ./

RUN npm install

COPY . .

EXPOSE 2000

CMD [ "npm", "start" ]